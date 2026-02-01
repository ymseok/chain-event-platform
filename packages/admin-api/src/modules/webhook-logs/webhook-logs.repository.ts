import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WebhookLog, Prisma } from '@prisma/client';

@Injectable()
export class WebhookLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<WebhookLog | null> {
    return this.prisma.webhookLog.findUnique({ where: { id } });
  }

  async findByWebhookId(
    webhookId: string,
    skip: number,
    take: number,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<[WebhookLog[], number]> {
    const where: Prisma.WebhookLogWhereInput = {
      webhookId,
      ...(status && { status: status as any }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookLog.count({ where }),
    ]);

    return [logs, total];
  }

  async findBySubscriptionId(
    eventSubscriptionId: string,
    skip: number,
    take: number,
    status?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<[WebhookLog[], number]> {
    const where: Prisma.WebhookLogWhereInput = {
      eventSubscriptionId,
      ...(status && { status: status as any }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookLog.count({ where }),
    ]);

    return [logs, total];
  }
}
