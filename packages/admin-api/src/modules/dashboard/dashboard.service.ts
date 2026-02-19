import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import { DashboardRepository } from './dashboard.repository';
import {
  DailyEventStatsResponseDto,
  TopApplicationsResponseDto,
  CumulativeStatsResponseDto,
} from './dto/event-stats.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    const membershipFilter = { members: { some: { userId } } };

    const [applicationCount, programCount, webhookCount, subscriptionCount] =
      await Promise.all([
        this.prisma.application.count({ where: membershipFilter }),
        this.prisma.program.count({
          where: { application: membershipFilter },
        }),
        this.prisma.webhook.count({
          where: { application: membershipFilter },
        }),
        this.prisma.eventSubscription.count({
          where: { webhook: { application: membershipFilter } },
        }),
      ]);

    return {
      applications: applicationCount,
      programs: programCount,
      webhooks: webhookCount,
      subscriptions: subscriptionCount,
    };
  }

  async getDailyEventStats(userId: string, days: number): Promise<DailyEventStatsResponseDto> {
    const data = await this.dashboardRepository.getDailyEventStats(userId, days);
    return { data, days };
  }

  async getTopApplications(
    userId: string,
    days: number,
    limit: number,
  ): Promise<TopApplicationsResponseDto> {
    const data = await this.dashboardRepository.getTopApplications(userId, days, limit);
    return { data, days, limit };
  }

  async getCumulativeStats(userId: string, days: number): Promise<CumulativeStatsResponseDto> {
    const data = await this.dashboardRepository.getCumulativeStats(userId, days);
    return { data, days };
  }
}
