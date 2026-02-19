import { ApiProperty } from '@nestjs/swagger';
import { AppRole } from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: AppRole })
  role: AppRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: {
    id: string;
    applicationId: string;
    userId: string;
    role: AppRole;
    createdAt: Date;
    updatedAt: Date;
    user: { email: string; name: string };
  }): MemberResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      userId: entity.userId,
      email: entity.user.email,
      name: entity.user.name,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
