import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { AppRole } from '@prisma/client';

export class CreateInviteDto {
  @ApiProperty({ description: 'Email of the user to invite', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Role to assign',
    enum: AppRole,
    default: AppRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(AppRole)
  role?: AppRole = AppRole.MEMBER;
}
