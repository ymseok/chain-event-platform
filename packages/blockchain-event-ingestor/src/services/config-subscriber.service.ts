import Redis from 'ioredis';
import { Config } from '../config';
import { ConfigRefreshSignal, ConfigRefreshType } from '../types';
import { createLogger } from './logger.service';

const logger = createLogger('ConfigSubscriber');

const CONFIG_REFRESH_CHANNEL = 'config:refresh';

export type RefreshHandler = (type: ConfigRefreshType) => Promise<void>;

export class ConfigSubscriberService {
  private subscriber: Redis;
  private handlers: RefreshHandler[] = [];

  constructor(private config: Config) {
    // Create a separate Redis connection for subscription
    // (ioredis requires separate connections for pub/sub)
    this.subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null, // Required for subscriber mode
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        logger.info(`Reconnecting to Redis in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    this.subscriber.on('connect', () => {
      logger.info('Connected to Redis for config subscription');
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { error: error.message });
    });
  }

  /**
   * Register a handler for config refresh signals
   */
  onRefresh(handler: RefreshHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Start listening for config refresh signals
   */
  async start(): Promise<void> {
    await this.subscriber.subscribe(CONFIG_REFRESH_CHANNEL);
    logger.info(`Subscribed to channel: ${CONFIG_REFRESH_CHANNEL}`);

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== CONFIG_REFRESH_CHANNEL) return;

      try {
        const signal: ConfigRefreshSignal = JSON.parse(message);
        logger.info(`Received config refresh signal: ${signal.type}`);

        // Call all registered handlers
        for (const handler of this.handlers) {
          try {
            await handler(signal.type);
          } catch (error) {
            logger.error('Error in refresh handler', { error });
          }
        }
      } catch (error) {
        logger.error('Failed to parse config refresh signal', { error, message });
      }
    });
  }

  /**
   * Stop listening and close connection
   */
  async stop(): Promise<void> {
    await this.subscriber.unsubscribe(CONFIG_REFRESH_CHANNEL);
    await this.subscriber.quit();
    logger.info('Config subscriber stopped');
  }
}
