import { ApiProperty } from '@nestjs/swagger';

export class IngestorClaimedAppDto {
  @ApiProperty({ description: 'Application ID' })
  appId: string;

  @ApiProperty({ description: 'Application name' })
  appName: string;

  @ApiProperty({ description: 'Remaining TTL of the lease in seconds' })
  leaseTtlRemaining: number;
}

export class IngestorInstanceDto {
  @ApiProperty({ description: 'Ingestor instance ID' })
  instanceId: string;

  @ApiProperty({ type: [IngestorClaimedAppDto], description: 'Claimed applications' })
  claimedApps: IngestorClaimedAppDto[];
}

export class UnclaimedAppDto {
  @ApiProperty({ description: 'Application ID' })
  appId: string;

  @ApiProperty({ description: 'Application name' })
  appName: string;
}

export class IngestorInstancesResponseDto {
  @ApiProperty({ type: [IngestorInstanceDto], description: 'Active ingestor instances' })
  instances: IngestorInstanceDto[];

  @ApiProperty({ type: [UnclaimedAppDto], description: 'Applications not claimed by any ingestor' })
  unclaimedApps: UnclaimedAppDto[];
}

export class RebalanceResponseDto {
  @ApiProperty({ description: 'Result message' })
  message: string;

  @ApiProperty({ description: 'Number of claims released' })
  released: number;

  @ApiProperty({ description: 'Total number of applications' })
  totalApps: number;

  @ApiProperty({ description: 'Total number of ingestor instances' })
  totalInstances: number;
}
