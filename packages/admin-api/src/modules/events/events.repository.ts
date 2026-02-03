import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Event, Prisma } from '@prisma/client';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: Prisma.EventCreateManyInput[]): Promise<void> {
    await this.prisma.event.createMany({ data });
  }

  async findById(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async findAllByProgramId(programId: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { programId },
      orderBy: { name: 'asc' },
    });
  }

  async findAllByProgramIdPaginated(
    programId: string,
    skip: number,
    take: number,
  ): Promise<[Event[], number]> {
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { programId },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.event.count({ where: { programId } }),
    ]);
    return [events, total];
  }

  async deleteByIds(ids: string[]): Promise<void> {
    await this.prisma.event.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
