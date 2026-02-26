import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DispatcherApplicationDto {
  @ApiProperty({ description: 'Application ID' })
  id: string;

  @ApiProperty({ description: 'Application name' })
  name: string;
}

export class DispatcherSubscriptionEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ description: 'Event name' })
  name: string;

  @ApiProperty({ description: 'Event signature (topic0)' })
  signature: string;
}

export class DispatcherSubscriptionWebhookDto {
  @ApiProperty({ description: 'Webhook ID' })
  id: string;

  @ApiProperty({ description: 'Webhook name' })
  name: string;

  @ApiProperty({ description: 'Webhook URL' })
  url: string;

  @ApiProperty({ description: 'Webhook secret for HMAC signing' })
  secret: string;

  @ApiPropertyOptional({ description: 'Custom headers' })
  headers: Record<string, string> | null;

  @ApiProperty({ description: 'Retry policy configuration' })
  retryPolicy: object;

  @ApiProperty({ description: 'Webhook status' })
  status: string;
}

export class DispatcherSubscriptionResponseDto {
  @ApiProperty({ description: 'Subscription ID' })
  id: string;

  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Webhook ID' })
  webhookId: string;

  @ApiPropertyOptional({ description: 'Filter conditions' })
  filterConditions: unknown;

  @ApiProperty({ description: 'Subscription status' })
  status: string;

  @ApiProperty({ type: DispatcherSubscriptionEventDto })
  event: DispatcherSubscriptionEventDto;

  @ApiProperty({ type: DispatcherSubscriptionWebhookDto })
  webhook: DispatcherSubscriptionWebhookDto;
}
