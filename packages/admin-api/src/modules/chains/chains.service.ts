import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChainResponseDto } from './dto/chain-response.dto';

@Injectable()
export class ChainsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ChainResponseDto[]> {
    const chains = await this.prisma.chain.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
    });
    return chains.map(ChainResponseDto.fromEntity);
  }

  async findById(id: number) {
    return this.prisma.chain.findUnique({ where: { id } });
  }
}
