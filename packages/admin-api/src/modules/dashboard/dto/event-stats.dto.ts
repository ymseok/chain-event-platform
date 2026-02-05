import { ApiProperty } from '@nestjs/swagger';

export class DailyEventStatsDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ description: 'Total events for the day' })
  total: number;

  @ApiProperty({ description: 'Successful events for the day' })
  success: number;

  @ApiProperty({ description: 'Failed events for the day' })
  failed: number;
}

export class DailyEventStatsResponseDto {
  @ApiProperty({ type: [DailyEventStatsDto], description: 'Daily event statistics' })
  data: DailyEventStatsDto[];

  @ApiProperty({ description: 'Number of days requested' })
  days: number;
}

export class TopApplicationDto {
  @ApiProperty({ description: 'Application ID' })
  applicationId: string;

  @ApiProperty({ description: 'Application name' })
  applicationName: string;

  @ApiProperty({ description: 'Total event count in the period' })
  eventCount: number;
}

export class TopApplicationsResponseDto {
  @ApiProperty({ type: [TopApplicationDto], description: 'Top applications by event count' })
  data: TopApplicationDto[];

  @ApiProperty({ description: 'Number of days in the period' })
  days: number;

  @ApiProperty({ description: 'Maximum number of applications returned' })
  limit: number;
}

export class CumulativeStatsDto {
  @ApiProperty({ description: 'Total events in the period' })
  totalEvents: number;

  @ApiProperty({ description: 'Successful events in the period' })
  successfulEvents: number;

  @ApiProperty({ description: 'Failed events in the period' })
  failedEvents: number;

  @ApiProperty({ description: 'Pending events in the period' })
  pendingEvents: number;

  @ApiProperty({ description: 'Success rate as a percentage' })
  successRate: number;

  @ApiProperty({ description: 'Average response time in milliseconds' })
  avgResponseTimeMs: number;
}

export class CumulativeStatsResponseDto {
  @ApiProperty({ type: CumulativeStatsDto, description: 'Cumulative statistics' })
  data: CumulativeStatsDto;

  @ApiProperty({ description: 'Number of days in the period' })
  days: number;
}
