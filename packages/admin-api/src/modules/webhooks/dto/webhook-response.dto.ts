import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Webhook } from '@prisma/client';

export class WebhookResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  headers: unknown;

  @ApiProperty()
  retryPolicy: unknown;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Webhook): WebhookResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      name: entity.name,
      url: entity.url,
      headers: entity.headers,
      retryPolicy: entity.retryPolicy,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class WebhookTestResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  statusCode: number | null;

  @ApiPropertyOptional()
  responseTimeMs: number | null;

  @ApiProperty()
  message: string;
}
