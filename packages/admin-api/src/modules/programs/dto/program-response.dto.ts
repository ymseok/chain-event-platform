import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Program, Event, Chain } from '@prisma/client';

export class ProgramResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  applicationId: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  contractAddress: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Program & { chain?: Chain }): ProgramResponseDto {
    return {
      id: entity.id,
      applicationId: entity.applicationId,
      chainId: entity.chainId,
      name: entity.name,
      contractAddress: entity.contractAddress,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class EventResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  signature: string;

  @ApiProperty()
  parameters: unknown;

  @ApiProperty()
  createdAt: Date;
}

export class ProgramDetailResponseDto extends ProgramResponseDto {
  @ApiProperty({ type: [EventResponseDto] })
  events: EventResponseDto[];

  @ApiPropertyOptional()
  chain?: { id: number; name: string; chainId: number };

  static fromEntity(
    entity: Program & { events: Event[]; chain?: Chain },
  ): ProgramDetailResponseDto {
    return {
      ...ProgramResponseDto.fromEntity(entity),
      events: entity.events.map((e) => ({
        id: e.id,
        name: e.name,
        signature: e.signature,
        parameters: e.parameters,
        createdAt: e.createdAt,
      })),
      chain: entity.chain
        ? { id: entity.chain.id, name: entity.chain.name, chainId: entity.chain.chainId }
        : undefined,
    };
  }
}
