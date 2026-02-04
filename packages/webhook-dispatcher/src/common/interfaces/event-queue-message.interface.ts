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
