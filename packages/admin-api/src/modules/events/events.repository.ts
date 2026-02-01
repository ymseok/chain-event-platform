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
}
