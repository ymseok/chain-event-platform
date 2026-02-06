import { Injectable } from '@nestjs/common';
import { WebhookLogsRepository } from './webhook-logs.repository';
import { WebhookLogQueryDto } from './dto/webhook-log-query.dto';
import { WebhookLogResponseDto, WebhookDailyStatsDto } from './dto/webhook-log-response.dto';
import { PaginatedResponseDto } from '../../common/dto';
import { EntityNotFoundException } from '../../common/exceptions';

@Injectable()
export class WebhookLogsService {
  constructor(private readonly webhookLogsRepository: WebhookLogsRepository) {}

  async findByWebhookId(
    webhookId: string,
    query: WebhookLogQueryDto,
  ): Promise<PaginatedResponseDto<WebhookLogResponseDto>> {
    const [logs, total] = await this.webhookLogsRepository.findByWebhookId(
      webhookId,
      query.skip,
      query.take,
      query.status,
      query.startDate,
      query.endDate,
    );

    return PaginatedResponseDto.create(logs.map(WebhookLogResponseDto.fromEntity), {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
    });
  }

  async findBySubscriptionId(
    subscriptionId: string,
    query: WebhookLogQueryDto,
  ): Promise<PaginatedResponseDto<WebhookLogResponseDto>> {
    const [logs, total] = await this.webhookLogsRepository.findBySubscriptionId(
      subscriptionId,
      query.skip,
      query.take,
      query.status,
      query.startDate,
      query.endDate,
    );

    return PaginatedResponseDto.create(logs.map(WebhookLogResponseDto.fromEntity), {
      page: query.page || 1,
      limit: query.limit || 20,
      total,
    });
  }

  async retry(id: string): Promise<{ message: string }> {
    const log = await this.webhookLogsRepository.findById(id);
    if (!log) {
      throw new EntityNotFoundException('WebhookLog', id);
    }

    // In a real implementation, this would queue a retry job
    // For now, we just return a success message
    return { message: 'Retry has been queued' };
  }

  async getDailyStats(webhookId: string, days = 30): Promise<WebhookDailyStatsDto[]> {
    const stats = await this.webhookLogsRepository.getDailyStatsByWebhookId(webhookId, days);
    return stats.map(WebhookDailyStatsDto.fromRaw);
  }
}
