import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WebhookLogStatus } from '@prisma/client';
import { WebhookPayload } from '../../common/interfaces';
import { EventQueueMessage } from '../../common/interfaces';

export interface CreateWebhookLogParams {
  webhookId: string;
  eventSubscriptionId: string;
  eventPayload: EventQueueMessage;
  requestPayload: WebhookPayload;
}

export interface UpdateWebhookLogParams {
  responseStatus?: number;
  responseBody?: string;
  responseTimeMs?: number;
  attemptCount?: number;
  status?: WebhookLogStatus;
  errorMessage?: string;
  succeededAt?: Date;
  failedAt?: Date;
}

@Injectable()
export class WebhookLogRepository {
  private readonly logger = new Logger(WebhookLogRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(params: CreateWebhookLogParams): Promise<string> {
    const log = await this.prisma.webhookLog.create({
      data: {
        webhookId: params.webhookId,
        eventSubscriptionId: params.eventSubscriptionId,
        eventPayload: params.eventPayload as object,
        requestPayload: params.requestPayload as object,
        status: 'PENDING',
      },
    });

    return log.id;
  }

  async update(logId: string, params: UpdateWebhookLogParams): Promise<void> {
    await this.prisma.webhookLog.update({
      where: { id: logId },
      data: params,
    });
  }

  async markSuccess(
    logId: string,
    responseStatus: number,
    responseBody: string,
    responseTimeMs: number,
    attemptCount: number,
  ): Promise<void> {
    await this.update(logId, {
      responseStatus,
      responseBody,
      responseTimeMs,
      attemptCount,
      status: 'SUCCESS',
      succeededAt: new Date(),
    });
  }

  async markFailed(
    logId: string,
    errorMessage: string,
    attemptCount: number,
    responseStatus?: number,
    responseBody?: string,
    responseTimeMs?: number,
  ): Promise<void> {
    await this.update(logId, {
      responseStatus,
      responseBody,
      responseTimeMs,
      attemptCount,
      status: 'FAILED',
      errorMessage,
      failedAt: new Date(),
    });
  }
}
