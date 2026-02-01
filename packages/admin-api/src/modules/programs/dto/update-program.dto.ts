import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export class UpdateProgramDto {
  @ApiPropertyOptional({ example: 'Updated Contract Name' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsEnum(['ACTIVE', 'INACTIVE'])
  @IsOptional()
  status?: string;
}
