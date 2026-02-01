import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKey } from '@prisma/client';

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'First 8 characters of the key for identification' })
  keyPrefix: string;

  @ApiPropertyOptional()
  expiresAt: Date | null;

  @ApiPropertyOptional()
  revokedAt: Date | null;

  @ApiPropertyOptional()
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: ApiKey): ApiKeyResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      name: entity.name,
      keyPrefix: entity.keyPrefix,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      lastUsedAt: entity.lastUsedAt,
      createdAt: entity.createdAt,
    };
  }
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({ description: 'Full API key - only shown once at creation' })
  key: string;
}
