import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';

export class WebhookLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'SUCCESS', 'FAILED'] })
  @IsEnum(['PENDING', 'SUCCESS', 'FAILED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: Date;
}
