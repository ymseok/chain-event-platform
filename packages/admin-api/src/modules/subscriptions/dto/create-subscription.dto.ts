import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterConditionDto {
  @ApiProperty({ example: 'from' })
  @IsString()
  @IsNotEmpty()
  field!: string;

  @ApiProperty({ example: 'eq', enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'] })
  @IsIn(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'])
  operator!: string;

  @ApiProperty({ example: '0x...' })
  @IsNotEmpty()
  value!: string | number | boolean;
}

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-of-event' })
  @IsUUID()
  @IsNotEmpty()
  eventId!: string;

  @ApiProperty({ example: 'uuid-of-webhook' })
  @IsUUID()
  @IsNotEmpty()
  webhookId!: string;

  @ApiPropertyOptional({ type: [FilterConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterConditionDto)
  @IsOptional()
  filterConditions?: FilterConditionDto[];
}
