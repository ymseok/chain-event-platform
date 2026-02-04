import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import {
  REDIS_CLIENT,
  CONFIG_REFRESH_CHANNEL,
  ConfigRefreshType,
  ConfigRefreshSignal,
} from './redis.constants';

@Injectable()
export class RedisPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit();
  }

  async publishConfigRefresh(type: ConfigRefreshType): Promise<void> {
    const signal: ConfigRefreshSignal = {
      type,
      timestamp: Date.now(),
    };

    try {
      await this.redis.publish(CONFIG_REFRESH_CHANNEL, JSON.stringify(signal));
      this.logger.log(`Published config refresh signal: ${type}`);
    } catch (error) {
      this.logger.error(`Failed to publish config refresh signal: ${error}`);
      throw error;
    }
  }

  async publishChainCreated(): Promise<void> {
    return this.publishConfigRefresh('CHAIN_CREATED');
  }

  async publishChainUpdated(): Promise<void> {
    return this.publishConfigRefresh('CHAIN_UPDATED');
  }

  async publishChainDeleted(): Promise<void> {
    return this.publishConfigRefresh('CHAIN_DELETED');
  }

  async publishSubscriptionCreated(): Promise<void> {
    return this.publishConfigRefresh('SUBSCRIPTION_CREATED');
  }

  async publishSubscriptionUpdated(): Promise<void> {
    return this.publishConfigRefresh('SUBSCRIPTION_UPDATED');
  }

  async publishSubscriptionDeleted(): Promise<void> {
    return this.publishConfigRefresh('SUBSCRIPTION_DELETED');
  }

  async publishProgramCreated(): Promise<void> {
    return this.publishConfigRefresh('PROGRAM_CREATED');
  }

  async publishProgramUpdated(): Promise<void> {
    return this.publishConfigRefresh('PROGRAM_UPDATED');
  }

  async publishProgramDeleted(): Promise<void> {
    return this.publishConfigRefresh('PROGRAM_DELETED');
  }

  async publishFullRefresh(): Promise<void> {
    return this.publishConfigRefresh('FULL_REFRESH');
  }
}
