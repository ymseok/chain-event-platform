import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Program, Event, Chain } from '@prisma/client';

export class ChainResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  chainId: number;
}

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

  @ApiPropertyOptional({ type: ChainResponseDto })
  chain?: ChainResponseDto;

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
      chain: entity.chain
        ? { id: entity.chain.id, name: entity.chain.name, chainId: entity.chain.chainId }
        : undefined,
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
  @ApiProperty({ description: 'Contract ABI' })
  abi: unknown;

  @ApiProperty({ type: [EventResponseDto] })
  events: EventResponseDto[];

  static fromEntity(
    entity: Program & { events: Event[]; chain?: Chain },
  ): ProgramDetailResponseDto {
    return {
      ...ProgramResponseDto.fromEntity(entity),
      abi: entity.abi,
      events: entity.events.map((e) => ({
        id: e.id,
        name: e.name,
        signature: e.signature,
        parameters: e.parameters,
        createdAt: e.createdAt,
      })),
    };
  }
}
