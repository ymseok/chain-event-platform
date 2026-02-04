export const REDIS_CONSTANTS = {
  CONFIG_REFRESH_CHANNEL: 'config:refresh',
  QUEUE_PREFIX: 'webhook:app:',
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
