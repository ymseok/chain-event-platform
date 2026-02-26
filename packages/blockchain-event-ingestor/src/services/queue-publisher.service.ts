import Redis from 'ioredis';
import { Config } from '../config';
import { EventQueueMessage } from '../types';
import { createLogger } from './logger.service';

const logger = createLogger('QueuePublisher');

const STREAM_PREFIX = 'webhook:stream:';

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
   * Get stream name for an application
   */
  private getStreamName(applicationId: string): string {
    return `${STREAM_PREFIX}${applicationId}`;
  }

  /**
   * Publish an event to the application's stream
   */
  async publishEvent(
    applicationId: string,
    message: EventQueueMessage,
  ): Promise<void> {
    const streamName = this.getStreamName(applicationId);
    try {
      await this.redis.xadd(streamName, '*', 'data', JSON.stringify(message));
      logger.debug(`Published event to stream ${streamName}`, {
        subscriptionId: message.subscriptionId,
        blockNumber: message.metadata.blockNumber,
      });
    } catch (error) {
      logger.error(`Failed to publish event to stream ${streamName}`, { error });
      throw error;
    }
  }

  /**
   * Publish multiple events to their respective streams
   */
  async publishEvents(
    events: Array<{ applicationId: string; message: EventQueueMessage }>,
  ): Promise<void> {
    if (events.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const { applicationId, message } of events) {
      const streamName = this.getStreamName(applicationId);
      pipeline.xadd(streamName, '*', 'data', JSON.stringify(message));
    }

    try {
      await pipeline.exec();
      logger.info(`Published ${events.length} events to streams`);
    } catch (error) {
      logger.error('Failed to publish batch events', { error });
      throw error;
    }
  }

  /**
   * Publish events and update per-app progress atomically in a single Redis pipeline.
   * Used when partitioning is enabled to ensure events and progress markers
   * are committed together.
   */
  async publishEventsWithProgress(
    events: Array<{ applicationId: string; message: EventQueueMessage }>,
    progressUpdates: Array<{ key: string; value: string }>,
  ): Promise<void> {
    if (events.length === 0 && progressUpdates.length === 0) return;

    const pipeline = this.redis.pipeline();

    for (const { applicationId, message } of events) {
      const streamName = this.getStreamName(applicationId);
      pipeline.xadd(streamName, '*', 'data', JSON.stringify(message));
    }

    for (const { key, value } of progressUpdates) {
      pipeline.set(key, value);
    }

    try {
      await pipeline.exec();
      logger.info(
        `Published ${events.length} events with ${progressUpdates.length} progress updates`,
      );
    } catch (error) {
      logger.error('Failed to publish events with progress', { error });
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
