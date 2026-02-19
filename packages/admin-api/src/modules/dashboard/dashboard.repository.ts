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

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyEventStats(userId: string, days: number): Promise<DailyEventStatsDto[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<DailyEventStatsRaw[]>`
      SELECT
        DATE_TRUNC('day', wl.created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE wl.status = 'SUCCESS') as success,
        COUNT(*) FILTER (WHERE wl.status = 'FAILED') as failed
      FROM webhook_logs wl
      INNER JOIN webhooks w ON w.id = wl.webhook_id
      INNER JOIN applications a ON a.id = w.application_id
      INNER JOIN application_members am ON am.application_id = a.id
      WHERE am.user_id = ${userId}::uuid
        AND wl.created_at >= ${startDate}
      GROUP BY DATE_TRUNC('day', wl.created_at)
      ORDER BY date ASC
    `;

    // Fill in missing days with zeros
    const statsMap = new Map<string, DailyEventStatsDto>();

    // Initialize all days with zeros
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

    // Fill in actual data
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
