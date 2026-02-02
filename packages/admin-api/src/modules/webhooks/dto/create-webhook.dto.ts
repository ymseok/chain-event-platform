import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsUrl, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RetryPolicyDto {
  @ApiProperty({ example: 5 })
  maxRetries!: number;

  @ApiProperty({ example: 1000 })
  retryInterval!: number;

  @ApiProperty({ example: 2 })
  backoffMultiplier!: number;
}

export class CreateWebhookDto {
  @ApiProperty({ example: 'My Webhook' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'https://api.example.com/webhook' })
  @IsUrl()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({ example: 'your-api-key-here', description: 'API Key for X-API-Key header authentication' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ example: { Authorization: 'Bearer token' } })
  @IsObject()
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ type: RetryPolicyDto })
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  @IsOptional()
  retryPolicy?: RetryPolicyDto;
}
