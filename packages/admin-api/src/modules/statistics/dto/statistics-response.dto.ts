import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class StatisticsQueryDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: Date;
}

export class StatisticsResponseDto {
  @ApiProperty()
  period: {
    startDate: Date;
    endDate: Date;
  };

  @ApiProperty()
  programs: {
    total: number;
  };

  @ApiProperty()
  webhooks: {
    total: number;
  };

  @ApiProperty()
  subscriptions: {
    total: number;
  };

  @ApiProperty()
  deliveries: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  };

  @ApiProperty()
  performance: {
    avgResponseTimeMs: number;
  };
}
