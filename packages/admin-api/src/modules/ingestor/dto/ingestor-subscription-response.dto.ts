import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestorChainDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Network chain ID (e.g., 1 for Ethereum mainnet)' })
  chainId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  rpcUrl: string;

  @ApiProperty({ description: 'Block time in seconds' })
  blockTime: number;

  @ApiProperty({ description: 'Whether the chain is enabled for monitoring' })
  enabled: boolean;
}

export class IngestorSubscriptionDto {
  @ApiProperty({ description: 'Subscription ID' })
  id: string;

  @ApiProperty({ description: 'Event signature (topic0)' })
  eventSignature: string;

  @ApiProperty({ description: 'Event name' })
  eventName: string;

  @ApiProperty({ description: 'Smart contract address' })
  contractAddress: string;

  @ApiProperty({ description: 'Chain ID (internal)' })
  chainId: number;

  @ApiProperty({ description: 'Network chain ID' })
  networkChainId: number;

  @ApiProperty({ description: 'Application ID for queue routing' })
  applicationId: string;

  @ApiProperty({ description: 'Webhook ID' })
  webhookId: string;

  @ApiPropertyOptional({ description: 'Filter conditions' })
  filterConditions: unknown;

  @ApiProperty({ description: 'Contract ABI for event parsing' })
  abi: unknown;

  @ApiProperty({ description: 'Event parameters definition' })
  eventParameters: string;
}

export class IngestorSubscriptionsResponseDto {
  @ApiProperty({ type: [IngestorChainDto] })
  chains: IngestorChainDto[];

  @ApiProperty({ type: [IngestorSubscriptionDto] })
  subscriptions: IngestorSubscriptionDto[];
}
