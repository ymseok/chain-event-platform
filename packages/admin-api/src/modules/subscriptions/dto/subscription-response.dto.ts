import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventSubscription, Event, Webhook, Program } from '@prisma/client';

type EventWithProgram = Event & { program?: Program };

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
  event?: {
    id: string;
    name: string;
    signature: string;
    program?: { id: string; name: string; contractAddress: string };
  };

  @ApiPropertyOptional()
  webhook?: { id: string; name: string; url: string };

  static fromEntity(
    entity: EventSubscription & { event?: EventWithProgram; webhook?: Webhook },
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
        ? {
            id: entity.event.id,
            name: entity.event.name,
            signature: entity.event.signature,
            program: entity.event.program
              ? {
                  id: entity.event.program.id,
                  name: entity.event.program.name,
                  contractAddress: entity.event.program.contractAddress,
                }
              : undefined,
          }
        : undefined,
      webhook: entity.webhook
        ? { id: entity.webhook.id, name: entity.webhook.name, url: entity.webhook.url }
        : undefined,
    };
  }
}
