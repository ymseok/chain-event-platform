export interface WebhookPayload {
  id: string;
  timestamp: number;
  subscriptionId: string;
  event: {
    name: string;
    topic: string;
    data: Record<string, unknown>;
  };
  metadata: {
    blockNumber: number;
    transactionHash: string;
    logIndex: number;
    chainId: number;
    contractAddress: string;
    blockTimestamp: number;
  };
}

export interface WebhookHeaders {
  'Content-Type': string;
  'X-Webhook-Id': string;
  'X-Webhook-Timestamp': string;
  'X-Webhook-Signature': string;
  [key: string]: string;
}
