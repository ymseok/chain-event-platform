import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  REDIS_CONSTANTS,
  ConfigRefreshSignal,
} from '../common/constants/redis.constants';

export type ConfigRefreshHandler = (signal: ConfigRefreshSignal) => void;

@Injectable()
export class RedisSubscriberService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisSubscriberService.name);
  private subscriber: Redis;
  private handlers: ConfigRefreshHandler[] = [];

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('redis.host');
    const port = this.configService.get<number>('redis.port');

    this.subscriber = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error('Max Redis reconnection attempts reached');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.subscriber.on('connect', () => {
      this.logger.log('Redis subscriber connected');
    });

    this.subscriber.on('error', (error) => {
      this.logger.error('Redis subscriber error', error.message);
    });

    this.setupSubscription();
  }

  private setupSubscription() {
    this.subscriber.subscribe(
      REDIS_CONSTANTS.CONFIG_REFRESH_CHANNEL,
      (err, count) => {
        if (err) {
          this.logger.error(
            `Failed to subscribe to ${REDIS_CONSTANTS.CONFIG_REFRESH_CHANNEL}`,
            err.message,
          );
        } else {
          this.logger.log(
            `Subscribed to ${count} channel(s): ${REDIS_CONSTANTS.CONFIG_REFRESH_CHANNEL}`,
          );
        }
      },
    );

    this.subscriber.on('message', (channel, message) => {
      if (channel === REDIS_CONSTANTS.CONFIG_REFRESH_CHANNEL) {
        try {
          const signal: ConfigRefreshSignal = JSON.parse(message);
          this.logger.debug(`Received config refresh signal: ${signal.type}`);
          this.handlers.forEach((handler) => handler(signal));
        } catch (error) {
          this.logger.error('Failed to parse config refresh signal', message);
        }
      }
    });
  }

  onConfigRefresh(handler: ConfigRefreshHandler) {
    this.handlers.push(handler);
  }

  removeConfigRefreshHandler(handler: ConfigRefreshHandler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
    this.logger.log('Redis subscriber disconnected');
  }
}
