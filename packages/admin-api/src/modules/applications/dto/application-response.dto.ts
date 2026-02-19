import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Application, AppRole } from '@prisma/client';

export class ApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional({ enum: AppRole, description: 'Current user role in this application' })
  myRole?: AppRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Application, myRole?: AppRole): ApplicationResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      myRole,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
