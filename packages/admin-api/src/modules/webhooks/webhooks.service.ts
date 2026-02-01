import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksRepository } from './webhooks.repository';
import { ApplicationsService } from '../applications/applications.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookResponseDto, WebhookTestResultDto } from './dto/webhook-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { CryptoUtil } from '../../common/utils';
import { EntityNotFoundException } from '../../common/exceptions';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly webhooksRepository: WebhooksRepository,
    private readonly applicationsService: ApplicationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    createDto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const secret = CryptoUtil.generateWebhookSecret();
    const retryPolicy = createDto.retryPolicy || {
      maxRetries: 5,
      retryInterval: 1000,
      backoffMultiplier: 2,
    };
    const webhook = await this.webhooksRepository.create({
      applicationId,
      name: createDto.name,
      url: createDto.url,
      secret,
      headers: createDto.headers ? (createDto.headers as object) : undefined,
      retryPolicy: retryPolicy as object,
    });

    return WebhookResponseDto.fromEntity(webhook);
  }

  async findAllByApplicationId(
    userId: string,
    applicationId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WebhookResponseDto>> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const [webhooks, total] = await this.webhooksRepository.findAllByApplicationId(
      applicationId,
      pagination.skip,
      pagination.take,
    );

    return PaginatedResponseDto.create(webhooks.map(WebhookResponseDto.fromEntity), {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total,
    });
  }

  async findOne(userId: string, id: string): Promise<WebhookResponseDto> {
    const webhook = await this.webhooksRepository.findById(id);
    if (!webhook) {
      throw new EntityNotFoundException('Webhook', id);
    }

    await this.applicationsService.validateOwnership(userId, webhook.applicationId);
    return WebhookResponseDto.fromEntity(webhook);
  }

  async update(userId: string, id: string, updateDto: UpdateWebhookDto): Promise<WebhookResponseDto> {
    const webhook = await this.webhooksRepository.findById(id);
    if (!webhook) {
      throw new EntityNotFoundException('Webhook', id);
    }

    await this.applicationsService.validateOwnership(userId, webhook.applicationId);
    const updated = await this.webhooksRepository.update(id, {
      name: updateDto.name,
      url: updateDto.url,
      headers: updateDto.headers ? (updateDto.headers as object) : undefined,
      retryPolicy: updateDto.retryPolicy ? (updateDto.retryPolicy as object) : undefined,
      status: updateDto.status as 'ACTIVE' | 'INACTIVE' | undefined,
    });
    return WebhookResponseDto.fromEntity(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const webhook = await this.webhooksRepository.findById(id);
    if (!webhook) {
      throw new EntityNotFoundException('Webhook', id);
    }

    await this.applicationsService.validateOwnership(userId, webhook.applicationId);
    await this.webhooksRepository.delete(id);
  }

  async test(userId: string, id: string): Promise<WebhookTestResultDto> {
    const webhook = await this.webhooksRepository.findById(id);
    if (!webhook) {
      throw new EntityNotFoundException('Webhook', id);
    }

    await this.applicationsService.validateOwnership(userId, webhook.applicationId);

    const testPayload = {
      type: 'test',
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook from Chain Event Platform',
    };

    const signature = CryptoUtil.generateHmacSignature(
      JSON.stringify(testPayload),
      webhook.secret,
    );

    try {
      const startTime = Date.now();
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          ...(webhook.headers as Record<string, string>),
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(
          this.configService.get<number>('webhook.testTimeoutMs') || 5000,
        ),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        responseTimeMs: Date.now() - startTime,
        message: response.ok ? 'Webhook test successful' : `Failed with status ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        responseTimeMs: null,
        message: `Connection failed: ${(error as Error).message}`,
      };
    }
  }
}
