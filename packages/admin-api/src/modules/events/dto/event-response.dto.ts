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

  @ApiProperty({ description: 'Event parameters in format: (type1 name1, type2 name2, ...)' })
  parameters: string;

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
