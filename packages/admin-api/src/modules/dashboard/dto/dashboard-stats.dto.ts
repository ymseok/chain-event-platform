import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponseDto {
  @ApiProperty()
  applications: number;

  @ApiProperty()
  programs: number;

  @ApiProperty()
  webhooks: number;

  @ApiProperty()
  subscriptions: number;
}
