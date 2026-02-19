import { Injectable } from '@nestjs/common';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import { DashboardRepository } from './dashboard.repository';
import {
  DailyEventStatsResponseDto,
  TopApplicationsResponseDto,
  CumulativeStatsResponseDto,
} from './dto/event-stats.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    return this.dashboardRepository.getDashboardStats(userId);
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
