import { ApiProperty } from '@nestjs/swagger';

export class DispatcherClaimedAppDto {
  @ApiProperty({ description: 'Application ID' })
  appId: string;

  @ApiProperty({ description: 'Application name' })
  appName: string;

  @ApiProperty({ description: 'Remaining TTL of the lease in seconds' })
  leaseTtlRemaining: number;
}

export class DispatcherInstanceDto {
  @ApiProperty({ description: 'Dispatcher instance ID' })
  instanceId: string;

  @ApiProperty({ type: [DispatcherClaimedAppDto], description: 'Claimed applications' })
  claimedApps: DispatcherClaimedAppDto[];
}

export class DispatcherUnclaimedAppDto {
  @ApiProperty({ description: 'Application ID' })
  appId: string;

  @ApiProperty({ description: 'Application name' })
  appName: string;
}

export class DispatcherInstancesResponseDto {
  @ApiProperty({ type: [DispatcherInstanceDto], description: 'Active dispatcher instances' })
  instances: DispatcherInstanceDto[];

  @ApiProperty({ type: [DispatcherUnclaimedAppDto], description: 'Applications not claimed by any dispatcher' })
  unclaimedApps: DispatcherUnclaimedAppDto[];
}

export class DispatcherRebalanceResponseDto {
  @ApiProperty({ description: 'Result message' })
  message: string;

  @ApiProperty({ description: 'Number of claims released' })
  released: number;

  @ApiProperty({ description: 'Total number of applications' })
  totalApps: number;

  @ApiProperty({ description: 'Total number of dispatcher instances' })
  totalInstances: number;
}
