import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { StatisticsResponseDto, StatisticsQueryDto } from './dto/statistics-response.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Statistics')
@ApiBearerAuth()
@Controller('applications/:appId/stats')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get statistics for an application' })
  @ApiResponse({ status: 200, type: StatisticsResponseDto })
  async getStatistics(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() query: StatisticsQueryDto,
  ): Promise<StatisticsResponseDto> {
    return this.statisticsService.getApplicationStatistics(userId, applicationId, query);
  }
}
