export const REDIS_CONSTANTS = {
  CONFIG_REFRESH_CHANNEL: 'config:refresh',
  QUEUE_PREFIX: 'webhook:app:',
  STREAM_PREFIX: 'webhook:stream:',
  STREAM_GROUP: 'dispatcher-group',
  DLQ_STREAM_PREFIX: 'webhook:dlq:',
  DISPATCHER_INSTANCE_PREFIX: 'dispatcher:instance:',
  DISPATCHER_CLAIM_PREFIX: 'dispatcher:claim:',
  DISPATCHER_JOINED_CHANNEL: 'dispatcher:joined',
} as const;

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
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'APPLICATION_DELETED'
  | 'FULL_REFRESH';

export interface ConfigRefreshSignal {
  type: ConfigRefreshType;
  timestamp: number;
}
