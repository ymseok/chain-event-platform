import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
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
}
