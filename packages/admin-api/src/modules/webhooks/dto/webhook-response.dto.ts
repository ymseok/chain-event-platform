import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Webhook } from '@prisma/client';

export class WebhookCountDto {
  @ApiProperty()
  subscriptions: number;
}

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

  @ApiPropertyOptional({ type: WebhookCountDto })
  _count?: WebhookCountDto;

  static fromEntity(
    entity: Webhook & { _count?: { subscriptions: number } },
  ): WebhookResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      name: entity.name,
      url: entity.url,
      headers: WebhookResponseDto.maskHeaders(entity.headers),
      retryPolicy: entity.retryPolicy,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      _count: entity._count,
    };
  }

  private static readonly SENSITIVE_HEADER_PATTERNS = [
    /^authorization$/i,
    /^x-api-key$/i,
    /^x-auth-token$/i,
    /^x-secret$/i,
  ];

  private static maskHeaders(headers: unknown): unknown {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
      return headers;
    }

    const masked: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      const isSensitive = WebhookResponseDto.SENSITIVE_HEADER_PATTERNS.some(
        (pattern) => pattern.test(key),
      );
      if (isSensitive && typeof value === 'string') {
        masked[key] = value.length > 4
          ? value.slice(0, 4) + '****'
          : '****';
      } else {
        masked[key] = value;
      }
    }
    return masked;
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
