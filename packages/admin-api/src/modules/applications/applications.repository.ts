import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Application, Prisma } from '@prisma/client';

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ApplicationCreateInput): Promise<Application> {
    return this.prisma.application.create({ data });
  }

  async findById(id: string): Promise<Application | null> {
    return this.prisma.application.findUnique({ where: { id } });
  }

  async findAllByUserId(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[Application[], number]> {
    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.application.count({ where: { userId } }),
    ]);
    return [applications, total];
  }

  async update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application> {
    return this.prisma.application.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.application.delete({ where: { id } });
  }
}
