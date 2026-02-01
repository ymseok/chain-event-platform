import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApplicationsService } from '../applications/applications.service';
import { StatisticsResponseDto, StatisticsQueryDto } from './dto/statistics-response.dto';

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

    // Get webhook logs for the period
    const webhookLogs = await this.prisma.webhookLog.findMany({
      where: {
        webhook: { applicationId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        status: true,
        responseTimeMs: true,
      },
    });

    const totalDeliveries = webhookLogs.length;
    const successfulDeliveries = webhookLogs.filter((l) => l.status === 'SUCCESS').length;
    const failedDeliveries = webhookLogs.filter((l) => l.status === 'FAILED').length;
    const pendingDeliveries = webhookLogs.filter((l) => l.status === 'PENDING').length;

    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    const responseTimes = webhookLogs
      .filter((l) => l.responseTimeMs !== null)
      .map((l) => l.responseTimeMs as number);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

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
