import Redis from 'ioredis';
import { Config } from '../config';
import { createLogger } from './logger.service';

const logger = createLogger('AppProgress');

export class AppProgressService {
  private redis: Redis;

  constructor(private config: Config) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis for app progress tracking');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });
  }

  /**
   * Get the Redis key for an app's progress on a chain
   */
  getProgressKey(appId: string, chainId: number): string {
    return `app:progress:${appId}:${chainId}`;
  }

  /**
   * Get the last processed block for an app on a chain
   */
  async getProgress(appId: string, chainId: number): Promise<bigint | null> {
    const key = this.getProgressKey(appId, chainId);
    const value = await this.redis.get(key);
    if (value === null) return null;
    return BigInt(value);
  }

  /**
   * Set the progress for an app on a chain (used for initial setup)
   */
  async setProgress(appId: string, chainId: number, blockNumber: bigint): Promise<void> {
    const key = this.getProgressKey(appId, chainId);
    await this.redis.set(key, blockNumber.toString());
    logger.debug(`Set progress for app ${appId} chain ${chainId} to block ${blockNumber}`);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('App progress Redis connection closed');
  }
}
