import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import {
  DailyEventStatsResponseDto,
  TopApplicationsResponseDto,
  CumulativeStatsResponseDto,
} from './dto/event-stats.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics for current user' })
  @ApiResponse({ status: 200, type: DashboardStatsResponseDto })
  async getStats(
    @CurrentUser('id') userId: string,
  ): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getDashboardStats(userId);
  }

  @Get('events/daily')
  @ApiOperation({ summary: 'Get daily event statistics for the specified number of days' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  @ApiResponse({ status: 200, type: DailyEventStatsResponseDto })
  async getDailyEventStats(
    @CurrentUser('id') userId: string,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<DailyEventStatsResponseDto> {
    const validatedDays = Math.min(Math.max(days, 1), 90);
    return this.dashboardService.getDailyEventStats(userId, validatedDays);
  }

  @Get('top-applications')
  @ApiOperation({ summary: 'Get top applications by event count' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 7)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max applications to return (default: 5)' })
  @ApiResponse({ status: 200, type: TopApplicationsResponseDto })
  async getTopApplications(
    @CurrentUser('id') userId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ): Promise<TopApplicationsResponseDto> {
    const validatedDays = Math.min(Math.max(days, 1), 90);
    const validatedLimit = Math.min(Math.max(limit, 1), 20);
    return this.dashboardService.getTopApplications(userId, validatedDays, validatedLimit);
  }

  @Get('cumulative')
  @ApiOperation({ summary: 'Get cumulative statistics for the specified period' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 7)' })
  @ApiResponse({ status: 200, type: CumulativeStatsResponseDto })
  async getCumulativeStats(
    @CurrentUser('id') userId: string,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ): Promise<CumulativeStatsResponseDto> {
    const validatedDays = Math.min(Math.max(days, 1), 90);
    return this.dashboardService.getCumulativeStats(userId, validatedDays);
  }
}
