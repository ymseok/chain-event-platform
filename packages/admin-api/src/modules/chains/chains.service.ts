import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JsonRpcProvider } from 'ethers';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RedisPublisherService } from '../../redis';
import {
  ChainResponseDto,
  ChainAdminResponseDto,
  RpcCheckResultDto,
  CreateChainDto,
  UpdateChainDto,
} from './dto';

@Injectable()
export class ChainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async findAll(): Promise<ChainResponseDto[]> {
    const chains = await this.prisma.chain.findMany({
      where: { enabled: true },
      orderBy: { id: 'asc' },
    });
    return chains.map(ChainResponseDto.fromEntity);
  }

  async findById(id: number) {
    return this.prisma.chain.findUnique({ where: { id } });
  }

  async findAllAdmin(): Promise<ChainAdminResponseDto[]> {
    const chains = await this.prisma.chain.findMany({
      orderBy: { id: 'asc' },
    });
    return chains.map(ChainAdminResponseDto.fromEntity);
  }

  async findByIdAdmin(id: number): Promise<ChainAdminResponseDto> {
    const chain = await this.prisma.chain.findUnique({ where: { id } });
    if (!chain) {
      throw new NotFoundException(`Chain with ID ${id} not found`);
    }
    return ChainAdminResponseDto.fromEntity(chain);
  }

  async create(dto: CreateChainDto): Promise<ChainAdminResponseDto> {
    try {
      const chain = await this.prisma.chain.create({
        data: {
          name: dto.name,
          chainId: dto.chainId,
          rpcUrl: dto.rpcUrl,
          blockTime: dto.blockTime ?? 12,
          enabled: true,
        },
      });

      // Publish config refresh signal
      await this.redisPublisher.publishChainCreated();

      return ChainAdminResponseDto.fromEntity(chain);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) ?? [];
        if (target.includes('name')) {
          throw new ConflictException(`Chain with name "${dto.name}" already exists`);
        }
        if (target.includes('chain_id')) {
          throw new ConflictException(`Chain with chainId ${dto.chainId} already exists`);
        }
        throw new ConflictException('Chain with duplicate unique field already exists');
      }
      throw error;
    }
  }

  async update(id: number, dto: UpdateChainDto): Promise<ChainAdminResponseDto> {
    const existing = await this.prisma.chain.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Chain with ID ${id} not found`);
    }

    try {
      const chain = await this.prisma.chain.update({
        where: { id },
        data: dto,
      });

      // Publish config refresh signal
      await this.redisPublisher.publishChainUpdated();

      return ChainAdminResponseDto.fromEntity(chain);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target as string[]) ?? [];
        if (target.includes('name')) {
          throw new ConflictException(`Chain with name "${dto.name}" already exists`);
        }
        if (target.includes('chain_id')) {
          throw new ConflictException(`Chain with chainId ${dto.chainId} already exists`);
        }
        throw new ConflictException('Chain with duplicate unique field already exists');
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const existing = await this.prisma.chain.findUnique({
      where: { id },
      include: { _count: { select: { programs: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Chain with ID ${id} not found`);
    }

    if (existing._count.programs > 0) {
      throw new BadRequestException(
        `Cannot delete chain with ${existing._count.programs} associated program(s). Remove programs first.`,
      );
    }

    await this.prisma.chain.delete({ where: { id } });

    // Publish config refresh signal
    await this.redisPublisher.publishChainDeleted();
  }

  async checkRpcConnection(id: number): Promise<RpcCheckResultDto> {
    const chain = await this.prisma.chain.findUnique({ where: { id } });
    if (!chain) {
      throw new NotFoundException(`Chain with ID ${id} not found`);
    }

    const startTime = Date.now();

    try {
      const provider = new JsonRpcProvider(chain.rpcUrl);
      const blockNumber = await provider.getBlockNumber();
      const responseTimeMs = Date.now() - startTime;

      // If chain was disabled and RPC check succeeds, set to enabled
      if (!chain.enabled) {
        await this.prisma.chain.update({
          where: { id },
          data: { enabled: true },
        });
        // Publish config refresh signal when enabled changes
        await this.redisPublisher.publishChainUpdated();
      }

      return {
        success: true,
        latestBlockNumber: blockNumber,
        responseTimeMs,
        message: `Successfully connected. Latest block: ${blockNumber}`,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      // Set chain to disabled on RPC failure
      if (chain.enabled) {
        await this.prisma.chain.update({
          where: { id },
          data: { enabled: false },
        });
        // Publish config refresh signal when enabled changes
        await this.redisPublisher.publishChainUpdated();
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        latestBlockNumber: null,
        responseTimeMs,
        message: `RPC connection failed: ${errorMessage}`,
      };
    }
  }
}
