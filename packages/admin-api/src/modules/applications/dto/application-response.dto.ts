import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Application } from '@prisma/client';

export class ApplicationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Application): ApplicationResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
