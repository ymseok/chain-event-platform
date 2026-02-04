import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChainSyncStatus, Chain } from '@prisma/client';

type ChainSyncStatusWithChain = ChainSyncStatus & {
  chain: Chain;
};

export class ChainSyncStatusResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  chainId: number;

  @ApiProperty()
  chainName: string;

  @ApiProperty({ description: 'Network chain ID (e.g., 1 for Ethereum mainnet)' })
  networkChainId: number;

  @ApiProperty({ description: 'Latest synced block number as string' })
  latestBlockNumber: string;

  @ApiProperty({ enum: ['SYNCING', 'SYNCED', 'ERROR', 'STOPPED'] })
  syncStatus: string;

  @ApiPropertyOptional()
  lastSyncedAt: Date | null;

  @ApiPropertyOptional()
  lastError: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: ChainSyncStatusWithChain): ChainSyncStatusResponseDto {
    return {
      id: entity.id,
      chainId: entity.chainId,
      chainName: entity.chain.name,
      networkChainId: entity.chain.chainId,
      latestBlockNumber: entity.latestBlockNumber.toString(),
      syncStatus: entity.syncStatus,
      lastSyncedAt: entity.lastSyncedAt,
      lastError: entity.lastError,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
