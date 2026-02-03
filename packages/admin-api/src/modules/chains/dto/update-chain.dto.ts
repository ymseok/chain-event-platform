import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUrl,
  IsInt,
  IsPositive,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export class UpdateChainDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'Blockchain network chain ID' })
  @IsInt()
  @IsPositive()
  @IsOptional()
  chainId?: number;

  @ApiPropertyOptional()
  @IsUrl({ require_tld: false })
  @IsOptional()
  rpcUrl?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 3600 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(3600)
  blockTime?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}
