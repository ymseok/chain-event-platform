import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Program, Prisma, Chain } from '@prisma/client';

export type ProgramWithChainAndCount = Program & {
  chain: Chain | null;
  _count: { events: number };
};

@Injectable()
export class ProgramsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProgramUncheckedCreateInput): Promise<Program> {
    return this.prisma.program.create({ data });
  }

  async findById(id: string): Promise<Program | null> {
    return this.prisma.program.findUnique({ where: { id } });
  }

  async findByIdWithEvents(id: string) {
    return this.prisma.program.findUnique({
      where: { id },
      include: {
        events: true,
        chain: true,
      },
    });
  }

  async findAllByApplicationId(
    applicationId: string,
    skip: number,
    take: number,
  ): Promise<[ProgramWithChainAndCount[], number]> {
    const [programs, total] = await Promise.all([
      this.prisma.program.findMany({
        where: { applicationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          chain: true,
          _count: { select: { events: true } },
        },
      }),
      this.prisma.program.count({ where: { applicationId } }),
    ]);
    return [programs, total];
  }

  async update(id: string, data: Prisma.ProgramUpdateInput): Promise<Program> {
    return this.prisma.program.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.program.delete({ where: { id } });
  }
}
