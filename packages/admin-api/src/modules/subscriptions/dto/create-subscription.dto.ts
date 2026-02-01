import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsOptional, IsObject } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-of-event' })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ example: 'uuid-of-webhook' })
  @IsUUID()
  @IsNotEmpty()
  webhookId!: string;

  @ApiPropertyOptional({ example: { from: '0x...', amount: { gt: 1000 } } })
  @IsObject()
  @IsOptional()
  filterConditions?: Record<string, unknown>;
}
