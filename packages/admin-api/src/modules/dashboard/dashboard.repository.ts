import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DailyEventStatsDto, TopApplicationDto, CumulativeStatsDto } from './dto/event-stats.dto';

interface DailyEventStatsRaw {
  date: Date;
  total: bigint;
  success: bigint;
  failed: bigint;
}

interface TopApplicationRaw {
  application_id: string;
  application_name: string;
  event_count: bigint;
}

interface CumulativeStatsRaw {
  total_events: bigint;
  successful_events: bigint;
  failed_events: bigint;
  pending_events: bigint;
  avg_response_time_ms: number | null;
}

interface DashboardStatsRaw {
  applications: bigint;
  programs: bigint;
  webhooks: bigint;
  subscriptions: bigint;
}

export interface DashboardStats {
  applications: number;
  programs: number;
  webhooks: number;
  subscriptions: number;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const results = await this.prisma.$queryRaw<DashboardStatsRaw[]>`
      SELECT
        (SELECT COUNT(DISTINCT a.id) FROM applications a
         INNER JOIN application_members am ON am.application_id = a.id
         WHERE am.user_id = ${userId}::uuid) AS applications,
        (SELECT COUNT(DISTINCT p.id) FROM programs p
         INNER JOIN applications a ON a.id = p.application_id
         INNER JOIN application_members am ON am.application_id = a.id
         WHERE am.user_id = ${userId}::uuid) AS programs,
        (SELECT COUNT(DISTINCT w.id) FROM webhooks w
         INNER JOIN applications a ON a.id = w.application_id
         INNER JOIN application_members am ON am.application_id = a.id
         WHERE am.user_id = ${userId}::uuid) AS webhooks,
        (SELECT COUNT(DISTINCT es.id) FROM event_subscriptions es
         INNER JOIN webhooks w ON w.id = es.webhook_id
         INNER JOIN applications a ON a.id = w.application_id
         INNER JOIN application_members am ON am.application_id = a.id
         WHERE am.user_id = ${userId}::uuid) AS subscriptions
    `;

    const row = results[0];
    return {
      applications: Number(row?.applications || 0),
      programs: Number(row?.programs || 0),
      webhooks: Number(row?.webhooks || 0),
      subscriptions: Number(row?.subscriptions || 0),
    };
  }

  async getDailyEventStats(userId: string, days: number): Promise<DailyEventStatsDto[]> {
    const results = await this.prisma.$queryRaw<DailyEventStatsRaw[]>`
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
          DATE_TRUNC('day', wl.created_at) AS date,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE wl.status = 'SUCCESS') AS success,
          COUNT(*) FILTER (WHERE wl.status = 'FAILED') AS failed
        FROM webhook_logs wl
        INNER JOIN webhooks w ON w.id = wl.webhook_id
        INNER JOIN applications a ON a.id = w.application_id
        INNER JOIN application_members am ON am.application_id = a.id
        WHERE am.user_id = ${userId}::uuid
          AND wl.created_at >= CURRENT_DATE - ${days}::int
        GROUP BY DATE_TRUNC('day', wl.created_at)
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

  async getTopApplications(userId: string, days: number, limit: number): Promise<TopApplicationDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<TopApplicationRaw[]>`
      SELECT
        a.id as application_id,
        a.name as application_name,
        COUNT(wl.id) as event_count
      FROM applications a
      INNER JOIN application_members am ON am.application_id = a.id
      INNER JOIN webhooks w ON w.application_id = a.id
      INNER JOIN webhook_logs wl ON wl.webhook_id = w.id
      WHERE am.user_id = ${userId}::uuid
        AND wl.created_at >= ${startDate}
      GROUP BY a.id, a.name
      ORDER BY event_count DESC
      LIMIT ${limit}
    `;

    return results.map((row) => ({
      applicationId: row.application_id,
      applicationName: row.application_name,
      eventCount: Number(row.event_count),
    }));
  }

  async getCumulativeStats(userId: string, days: number): Promise<CumulativeStatsDto> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<CumulativeStatsRaw[]>`
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE wl.status = 'SUCCESS') as successful_events,
        COUNT(*) FILTER (WHERE wl.status = 'FAILED') as failed_events,
        COUNT(*) FILTER (WHERE wl.status = 'PENDING') as pending_events,
        AVG(wl.response_time_ms) FILTER (WHERE wl.response_time_ms IS NOT NULL) as avg_response_time_ms
      FROM webhook_logs wl
      INNER JOIN webhooks w ON w.id = wl.webhook_id
      INNER JOIN applications a ON a.id = w.application_id
      INNER JOIN application_members am ON am.application_id = a.id
      WHERE am.user_id = ${userId}::uuid
        AND wl.created_at >= ${startDate}
    `;

    const row = results[0];
    const totalEvents = Number(row?.total_events || 0);
    const successfulEvents = Number(row?.successful_events || 0);
    const failedEvents = Number(row?.failed_events || 0);
    const pendingEvents = Number(row?.pending_events || 0);
    const completedEvents = successfulEvents + failedEvents;
    const successRate = completedEvents > 0 ? (successfulEvents / completedEvents) * 100 : 0;

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      pendingEvents,
      successRate: Math.round(successRate * 100) / 100,
      avgResponseTimeMs: row?.avg_response_time_ms ? Math.round(row.avg_response_time_ms) : 0,
    };
  }
}
