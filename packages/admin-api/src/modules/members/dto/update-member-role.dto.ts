import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AppRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ description: 'New role for the member', enum: AppRole })
  @IsEnum(AppRole)
  role: AppRole;
}
