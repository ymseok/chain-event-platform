import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  expiresAt?: Date;
}
