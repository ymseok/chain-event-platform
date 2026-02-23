import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplicationsService } from '../applications/applications.service';
import { StatisticsResponseDto, StatisticsQueryDto } from './dto/statistics-response.dto';

interface DeliveryAggregation {
  total: bigint;
  successful: bigint;
  failed: bigint;
  pending: bigint;
  avg_response_time: number | null;
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async getApplicationStatistics(
    userId: string,
    applicationId: string,
    query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const startDate = query.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate || new Date();

    // Aggregate delivery stats in SQL instead of loading all rows into memory
    const [deliveryStats] = await this.prisma.$queryRaw<DeliveryAggregation[]>`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE wl.status = 'SUCCESS')::bigint AS successful,
        COUNT(*) FILTER (WHERE wl.status = 'FAILED')::bigint AS failed,
        COUNT(*) FILTER (WHERE wl.status = 'PENDING')::bigint AS pending,
        AVG(wl.response_time_ms) AS avg_response_time
      FROM webhook_logs wl
      JOIN webhooks w ON w.id = wl.webhook_id
      WHERE w.application_id = ${applicationId}::uuid
        AND wl.created_at >= ${startDate}
        AND wl.created_at <= ${endDate}
    `;

    const totalDeliveries = Number(deliveryStats?.total ?? 0);
    const successfulDeliveries = Number(deliveryStats?.successful ?? 0);
    const failedDeliveries = Number(deliveryStats?.failed ?? 0);
    const pendingDeliveries = Number(deliveryStats?.pending ?? 0);
    const avgResponseTime = deliveryStats?.avg_response_time ?? 0;
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    // Get counts
    const [programCount, webhookCount, subscriptionCount] = await Promise.all([
      this.prisma.program.count({ where: { applicationId } }),
      this.prisma.webhook.count({ where: { applicationId } }),
      this.prisma.eventSubscription.count({
        where: { webhook: { applicationId } },
      }),
    ]);

    return {
      period: { startDate, endDate },
      programs: { total: programCount },
      webhooks: { total: webhookCount },
      subscriptions: { total: subscriptionCount },
      deliveries: {
        total: totalDeliveries,
        successful: successfulDeliveries,
        failed: failedDeliveries,
        pending: pendingDeliveries,
        successRate: Math.round(successRate * 100) / 100,
      },
      performance: {
        avgResponseTimeMs: Math.round(avgResponseTime),
      },
    };
  }
}
