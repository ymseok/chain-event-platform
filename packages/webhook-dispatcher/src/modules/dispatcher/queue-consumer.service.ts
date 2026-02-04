import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  REDIS_CONSTANTS,
  ConfigRefreshSignal,
} from '../../common/constants/redis.constants';
import { EventQueueMessage } from '../../common/interfaces';
import { RedisSubscriberService } from '../../redis/redis-subscriber.service';
import { ApplicationRepository, ActiveApplication } from './application.repository';
import { DispatcherService } from './dispatcher.service';

interface ConsumerLoop {
  applicationId: string;
  running: boolean;
  redis: Redis;
}

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private consumers: Map<string, ConsumerLoop> = new Map();
  private isShuttingDown = false;
  private readonly brpopTimeoutSec: number;
  private readonly redisHost: string;
  private readonly redisPort: number;

  constructor(
    private configService: ConfigService,
    private applicationRepository: ApplicationRepository,
    private dispatcherService: DispatcherService,
    private redisSubscriberService: RedisSubscriberService,
  ) {
    this.brpopTimeoutSec = this.configService.get<number>(
      'webhook.brpopTimeoutSec',
      5,
    );
    this.redisHost = this.configService.get<string>('redis.host', 'localhost');
    this.redisPort = this.configService.get<number>('redis.port', 6379);
  }

  async onModuleInit() {
    this.logger.log('Initializing queue consumers...');

    this.redisSubscriberService.onConfigRefresh(
      this.handleConfigRefresh.bind(this),
    );

    await this.refreshApplications();
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down queue consumers...');
    this.isShuttingDown = true;

    const stopPromises: Promise<void>[] = [];
    for (const [appId] of this.consumers) {
      stopPromises.push(this.stopConsumer(appId));
    }
    await Promise.all(stopPromises);

    this.logger.log('All queue consumers stopped');
  }

  private handleConfigRefresh(signal: ConfigRefreshSignal) {
    if (
      signal.type === 'APPLICATION_CREATED' ||
      signal.type === 'APPLICATION_UPDATED' ||
      signal.type === 'APPLICATION_DELETED' ||
      signal.type === 'FULL_REFRESH'
    ) {
      this.logger.log(
        `Config refresh signal received: ${signal.type}, refreshing applications...`,
      );
      this.refreshApplications().catch((error) => {
        this.logger.error('Failed to refresh applications', error);
      });
    }
  }

  private async refreshApplications() {
    const applications = await this.applicationRepository.findAllActive();
    const activeAppIds = new Set(applications.map((app) => app.id));

    for (const [appId] of this.consumers) {
      if (!activeAppIds.has(appId)) {
        this.logger.log(`Stopping consumer for removed application: ${appId}`);
        await this.stopConsumer(appId);
      }
    }

    for (const app of applications) {
      if (!this.consumers.has(app.id)) {
        this.logger.log(
          `Starting consumer for new application: ${app.name} (${app.id})`,
        );
        this.startConsumer(app);
      }
    }

    this.logger.log(`Active consumers: ${this.consumers.size}`);
  }

  private getQueueName(applicationId: string): string {
    return `${REDIS_CONSTANTS.QUEUE_PREFIX}${applicationId}`;
  }

  private startConsumer(app: ActiveApplication) {
    const redis = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        if (times > 10 || this.isShuttingDown) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    const consumer: ConsumerLoop = {
      applicationId: app.id,
      running: true,
      redis,
    };

    this.consumers.set(app.id, consumer);

    this.consumeLoop(consumer).catch((error) => {
      this.logger.error(
        `Consumer loop error for ${app.id}: ${error.message}`,
        error.stack,
      );
    });
  }

  private async stopConsumer(applicationId: string) {
    const consumer = this.consumers.get(applicationId);
    if (!consumer) return;

    consumer.running = false;
    this.consumers.delete(applicationId);

    try {
      await consumer.redis.quit();
    } catch (error) {
      this.logger.warn(`Error closing Redis for ${applicationId}`);
    }
  }

  private async consumeLoop(consumer: ConsumerLoop) {
    const queueName = this.getQueueName(consumer.applicationId);
    this.logger.log(`Starting consume loop for queue: ${queueName}`);

    while (consumer.running && !this.isShuttingDown) {
      try {
        const result = await consumer.redis.brpop(
          queueName,
          this.brpopTimeoutSec,
        );

        if (!result) {
          continue;
        }

        const [, messageStr] = result;

        try {
          const message: EventQueueMessage = JSON.parse(messageStr);
          this.logger.debug(
            `Received message from ${queueName}: subscription=${message.subscriptionId}`,
          );

          await this.dispatcherService.dispatch(message);
        } catch (parseError) {
          this.logger.error(
            `Failed to parse message from ${queueName}: ${messageStr}`,
          );
        }
      } catch (error) {
        if (
          this.isShuttingDown ||
          !consumer.running ||
          (error instanceof Error &&
            (error.message.includes('Connection is closed') ||
              error.message.includes('Stream isn\'t writeable')))
        ) {
          break;
        }

        this.logger.error(
          `Error in consume loop for ${queueName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        await this.sleep(1000);
      }
    }

    this.logger.log(`Consume loop stopped for queue: ${queueName}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
