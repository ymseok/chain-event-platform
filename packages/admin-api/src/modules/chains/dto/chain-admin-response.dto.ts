import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chain } from '@prisma/client';

export class ChainAdminResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  rpcUrl: string;

  @ApiProperty()
  blockTime: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: Chain): ChainAdminResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      chainId: entity.chainId,
      rpcUrl: entity.rpcUrl,
      blockTime: entity.blockTime,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

export class RpcCheckResultDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  latestBlockNumber: number | null;

  @ApiPropertyOptional()
  responseTimeMs: number | null;

  @ApiProperty()
  message: string;
}
