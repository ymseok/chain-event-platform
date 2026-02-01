import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookLog } from '@prisma/client';

export class WebhookLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  webhookId: string;

  @ApiProperty()
  eventSubscriptionId: string;

  @ApiProperty()
  eventPayload: unknown;

  @ApiProperty()
  requestPayload: unknown;

  @ApiPropertyOptional()
  responseStatus: number | null;

  @ApiPropertyOptional()
  responseBody: string | null;

  @ApiPropertyOptional()
  responseTimeMs: number | null;

  @ApiProperty()
  attemptCount: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  errorMessage: string | null;

  @ApiPropertyOptional()
  succeededAt: Date | null;

  @ApiPropertyOptional()
  failedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: WebhookLog): WebhookLogResponseDto {
    return {
      id: entity.id,
      webhookId: entity.webhookId,
      eventSubscriptionId: entity.eventSubscriptionId,
      eventPayload: entity.eventPayload,
      requestPayload: entity.requestPayload,
      responseStatus: entity.responseStatus,
      responseBody: entity.responseBody,
      responseTimeMs: entity.responseTimeMs,
      attemptCount: entity.attemptCount,
      status: entity.status,
      errorMessage: entity.errorMessage,
      succeededAt: entity.succeededAt,
      failedAt: entity.failedAt,
      createdAt: entity.createdAt,
    };
  }
}
