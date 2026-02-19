import { ApiProperty } from '@nestjs/swagger';
import { AppRole, InviteStatus } from '@prisma/client';

export class InviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: AppRole })
  role: AppRole;

  @ApiProperty({ enum: InviteStatus })
  status: InviteStatus;

  @ApiProperty()
  invitedBy: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  applicationName?: string;

  @ApiProperty({ required: false })
  senderName?: string;

  static fromEntity(entity: {
    id: string;
    applicationId: string;
    email: string;
    role: AppRole;
    status: InviteStatus;
    invitedBy: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    application?: { name: string };
    sender?: { name: string };
  }): InviteResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      email: entity.email,
      role: entity.role,
      status: entity.status,
      invitedBy: entity.invitedBy,
      token: entity.token,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      applicationName: entity.application?.name,
      senderName: entity.sender?.name,
    };
  }
}
