import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateChainSyncStatusDto, ChainSyncStatusResponseDto } from './dto';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class ChainSyncStatusService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly includeChain = {
    chain: true,
  };

  async findAll(): Promise<ChainSyncStatusResponseDto[]> {
    const statuses = await this.prisma.chainSyncStatus.findMany({
      include: this.includeChain,
      orderBy: { chainId: 'asc' },
    });
    return statuses.map(ChainSyncStatusResponseDto.fromEntity);
  }

  async findByChainId(chainId: number): Promise<ChainSyncStatusResponseDto> {
    const status = await this.prisma.chainSyncStatus.findUnique({
      where: { chainId },
      include: this.includeChain,
    });

    if (!status) {
      throw new NotFoundException(`Sync status for chain ${chainId} not found`);
    }

    return ChainSyncStatusResponseDto.fromEntity(status);
  }

  async upsert(
    chainId: number,
    dto: UpdateChainSyncStatusDto,
  ): Promise<ChainSyncStatusResponseDto> {
    // Verify chain exists
    const chain = await this.prisma.chain.findUnique({
      where: { id: chainId },
    });

    if (!chain) {
      throw new NotFoundException(`Chain with ID ${chainId} not found`);
    }

    const latestBlockNumber = BigInt(dto.latestBlockNumber);

    const status = await this.prisma.chainSyncStatus.upsert({
      where: { chainId },
      create: {
        chainId,
        latestBlockNumber,
        syncStatus: dto.syncStatus as SyncStatus,
        lastSyncedAt: dto.syncStatus === 'SYNCED' ? new Date() : null,
        lastError: dto.lastError || null,
      },
      update: {
        latestBlockNumber,
        syncStatus: dto.syncStatus as SyncStatus,
        lastSyncedAt:
          dto.syncStatus === 'SYNCED' || dto.syncStatus === 'SYNCING'
            ? new Date()
            : undefined,
        lastError: dto.syncStatus === 'ERROR' ? dto.lastError : null,
      },
      include: this.includeChain,
    });

    return ChainSyncStatusResponseDto.fromEntity(status);
  }

  async delete(chainId: number): Promise<void> {
    const status = await this.prisma.chainSyncStatus.findUnique({
      where: { chainId },
    });

    if (!status) {
      throw new NotFoundException(`Sync status for chain ${chainId} not found`);
    }

    await this.prisma.chainSyncStatus.delete({
      where: { chainId },
    });
  }

  async setError(chainId: number, errorMessage: string): Promise<void> {
    await this.prisma.chainSyncStatus.update({
      where: { chainId },
      data: {
        syncStatus: 'ERROR',
        lastError: errorMessage,
      },
    });
  }

  async setStopped(chainId: number): Promise<void> {
    const status = await this.prisma.chainSyncStatus.findUnique({
      where: { chainId },
    });

    if (status) {
      await this.prisma.chainSyncStatus.update({
        where: { chainId },
        data: {
          syncStatus: 'STOPPED',
        },
      });
    }
  }
}
