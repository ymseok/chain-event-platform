import Redis from 'ioredis';
import { Config } from '../config';
import { EventQueueMessage } from '../types';
import { createLogger } from './logger.service';

const logger = createLogger('QueuePublisher');

export class QueuePublisherService {
  private redis: Redis;

  constructor(private config: Config) {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis for event queue publishing');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });
  }

  /**
   * Get queue name for an application
   */
  private getQueueName(applicationId: string): string {
    return `webhook:app:${applicationId}`;
  }

  /**
   * Publish an event to the application's queue
   */
  async publishEvent(
    applicationId: string,
    message: EventQueueMessage,
  ): Promise<void> {
    const queueName = this.getQueueName(applicationId);
    try {
      await this.redis.lpush(queueName, JSON.stringify(message));
      logger.debug(`Published event to queue ${queueName}`, {
        subscriptionId: message.subscriptionId,
        blockNumber: message.metadata.blockNumber,
      });
    } catch (error) {
      logger.error(`Failed to publish event to queue ${queueName}`, { error });
      throw error;
    }
  }

  /**
   * Publish multiple events to their respective queues
   */
  async publishEvents(
    events: Array<{ applicationId: string; message: EventQueueMessage }>,
  ): Promise<void> {
    if (events.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const { applicationId, message } of events) {
      const queueName = this.getQueueName(applicationId);
      pipeline.lpush(queueName, JSON.stringify(message));
    }

    try {
      await pipeline.exec();
      logger.info(`Published ${events.length} events to queues`);
    } catch (error) {
      logger.error('Failed to publish batch events', { error });
      throw error;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis queue publisher connection closed');
  }
}
