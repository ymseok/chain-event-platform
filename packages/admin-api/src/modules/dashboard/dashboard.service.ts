import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    const [applicationCount, programCount, webhookCount, subscriptionCount] =
      await Promise.all([
        this.prisma.application.count({ where: { userId } }),
        this.prisma.program.count({ where: { application: { userId } } }),
        this.prisma.webhook.count({ where: { application: { userId } } }),
        this.prisma.eventSubscription.count({
          where: { webhook: { application: { userId } } },
        }),
      ]);

    return {
      applications: applicationCount,
      programs: programCount,
      webhooks: webhookCount,
      subscriptions: subscriptionCount,
    };
  }
}
