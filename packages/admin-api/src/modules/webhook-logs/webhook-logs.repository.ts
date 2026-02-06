import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WebhookLog, Prisma } from '@prisma/client';

interface DailyStatsRaw {
  date: Date;
  total: bigint;
  success: bigint;
  failed: bigint;
}

export interface WebhookDailyStats {
  date: string;
  total: number;
  success: number;
  failed: number;
}

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

  async getDailyStatsByWebhookId(webhookId: string, days: number): Promise<WebhookDailyStats[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<DailyStatsRaw[]>`
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') as success,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failed
      FROM webhook_logs
      WHERE webhook_id = ${webhookId}::uuid
        AND created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `;

    // Fill in missing days with zeros
    const statsMap = new Map<string, WebhookDailyStats>();

    for (let i = 0; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      const dateStr = date.toISOString().split('T')[0];
      statsMap.set(dateStr, {
        date: dateStr,
        total: 0,
        success: 0,
        failed: 0,
      });
    }

    for (const row of results) {
      const dateStr = row.date.toISOString().split('T')[0];
      statsMap.set(dateStr, {
        date: dateStr,
        total: Number(row.total),
        success: Number(row.success),
        failed: Number(row.failed),
      });
    }

    return Array.from(statsMap.values());
  }
}
