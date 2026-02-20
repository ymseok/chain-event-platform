// Chain types
export interface Chain {
  id: number;
  chainId: number;
  name: string;
  rpcUrl: string;
  blockTime: number;
  enabled: boolean;
}

// Subscription types
export interface Subscription {
  id: string;
  eventSignature: string;
  eventName: string;
  contractAddress: string;
  chainId: number;
  networkChainId: number;
  applicationId: string;
  webhookId: string;
  filterConditions: unknown;
  abi: unknown;
  eventParameters: string;
}

// API Response types
export interface IngestorSubscriptionsResponse {
  chains: Chain[];
  subscriptions: Subscription[];
}

// Redis message types
export type ConfigRefreshType =
  | 'CHAIN_CREATED'
  | 'CHAIN_UPDATED'
  | 'CHAIN_DELETED'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_DELETED'
  | 'PROGRAM_CREATED'
  | 'PROGRAM_UPDATED'
  | 'PROGRAM_DELETED'
  | 'FULL_REFRESH';

export interface ConfigRefreshSignal {
  type: ConfigRefreshType;
  timestamp: number;
}

// Event queue message types
export interface EventQueueMessage {
  subscriptionId: string;
  eventTopic: string;
  data: Record<string, unknown>;
  metadata: {
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    chainId: number;
    contractAddress: string;
    timestamp: number;
  };
}

// Parsed event data
export interface ParsedEventData {
  name: string;
  signature: string;
  args: Record<string, unknown>;
}
