import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FilterConditionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ type: [FilterConditionDto], nullable: true })
  @ValidateIf((o) => o.filterConditions !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  @IsOptional()
  filterConditions?: FilterConditionDto[] | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'PAUSED'] })
  @IsEnum(['ACTIVE', 'PAUSED'])
  @IsOptional()
  status?: string;
}
