import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventSubscription, Event, Webhook } from '@prisma/client';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  eventId: string;

  @ApiProperty()
  webhookId: string;

  @ApiPropertyOptional()
  filterConditions: unknown;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  event?: { id: string; name: string; signature: string };

  @ApiPropertyOptional()
  webhook?: { id: string; name: string; url: string };

  static fromEntity(
    entity: EventSubscription & { event?: Event; webhook?: Webhook },
  ): SubscriptionResponseDto {
    return {
      id: entity.id,
      eventId: entity.eventId,
      webhookId: entity.webhookId,
      filterConditions: entity.filterConditions,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      event: entity.event
        ? { id: entity.event.id, name: entity.event.name, signature: entity.event.signature }
        : undefined,
      webhook: entity.webhook
        ? { id: entity.webhook.id, name: entity.webhook.name, url: entity.webhook.url }
        : undefined,
    };
  }
}
