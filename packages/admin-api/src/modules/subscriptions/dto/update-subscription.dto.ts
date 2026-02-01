import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsEnum } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: { from: '0x...', amount: { gt: 1000 } } })
  @IsObject()
  @IsOptional()
  filterConditions?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'PAUSED'] })
  @IsEnum(['ACTIVE', 'PAUSED'])
  @IsOptional()
  status?: string;
}
