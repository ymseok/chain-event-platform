import { ApiProperty } from '@nestjs/swagger';
import { Event } from '@prisma/client';

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  programId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  parameters: unknown;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(entity: Event): EventResponseDto {
    return {
      id: entity.id,
      programId: entity.programId,
      name: entity.name,
      signature: entity.signature,
      parameters: entity.parameters,
      createdAt: entity.createdAt,
    };
  }
}
