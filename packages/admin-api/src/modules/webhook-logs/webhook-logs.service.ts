import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { WebhookLogsRepository } from './webhook-logs.repository';
import { WebhookLogQueryDto } from './dto/webhook-log-query.dto';
import { WebhookLogResponseDto, WebhookDailyStatsDto } from './dto/webhook-log-response.dto';
import { PaginatedResponseDto } from '../../common/dto';
import { EntityNotFoundException } from '../../common/exceptions';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const WEBHOOK_QUEUE_PREFIX = 'webhook:app:';

@Injectable()
export class WebhookLogsService {
  constructor(
    private readonly webhookLogsRepository: WebhookLogsRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

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
    const log = await this.webhookLogsRepository.findByIdWithWebhook(id);
    if (!log) {
      throw new EntityNotFoundException('WebhookLog', id);
    }

    if (log.status !== 'FAILED') {
      throw new EntityNotFoundException('WebhookLog', id);
    }

    const queueName = `${WEBHOOK_QUEUE_PREFIX}${log.webhook.applicationId}`;
    await this.redis.lpush(queueName, JSON.stringify(log.eventPayload));

    return { message: 'Retry has been queued' };
  }

  async getDailyStats(webhookId: string, days = 30): Promise<WebhookDailyStatsDto[]> {
    const stats = await this.webhookLogsRepository.getDailyStatsByWebhookId(webhookId, days);
    return stats.map(WebhookDailyStatsDto.fromRaw);
  }
}
