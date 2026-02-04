export const REDIS_CLIENT = 'REDIS_CLIENT';
export const CONFIG_REFRESH_CHANNEL = 'config:refresh';

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
