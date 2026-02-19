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

  async findByIdWithWebhook(id: string) {
    return this.prisma.webhookLog.findUnique({
      where: { id },
      include: {
        webhook: {
          select: { applicationId: true },
        },
      },
    });
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
    const results = await this.prisma.$queryRaw<DailyStatsRaw[]>`
      SELECT
        d.date,
        COALESCE(s.total, 0) AS total,
        COALESCE(s.success, 0) AS success,
        COALESCE(s.failed, 0) AS failed
      FROM generate_series(
        CURRENT_DATE - ${days}::int,
        CURRENT_DATE,
        '1 day'::interval
      ) AS d(date)
      LEFT JOIN (
        SELECT
          DATE_TRUNC('day', created_at) AS date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'SUCCESS') AS success,
          COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
        FROM webhook_logs
        WHERE webhook_id = ${webhookId}::uuid
          AND created_at >= CURRENT_DATE - ${days}::int
        GROUP BY DATE_TRUNC('day', created_at)
      ) s ON s.date = d.date
      ORDER BY d.date ASC
    `;

    return results.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      total: Number(row.total),
      success: Number(row.success),
      failed: Number(row.failed),
    }));
  }
}
