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
import { AppClaimService } from './app-claim.service';

interface ConsumerLoop {
  applicationId: string;
  running: boolean;
  redisConnections: Redis[];
}

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private consumers: Map<string, ConsumerLoop> = new Map();
  private isShuttingDown = false;
  private readonly brpopTimeoutSec: number;
  private readonly redisHost: string;
  private readonly redisPort: number;
  private readonly concurrencyPerApp: number;

  constructor(
    private configService: ConfigService,
    private applicationRepository: ApplicationRepository,
    private dispatcherService: DispatcherService,
    private redisSubscriberService: RedisSubscriberService,
    private appClaimService: AppClaimService,
  ) {
    this.brpopTimeoutSec = this.configService.get<number>(
      'webhook.brpopTimeoutSec',
      5,
    );
    this.redisHost = this.configService.get<string>('redis.host', 'localhost');
    this.redisPort = this.configService.get<number>('redis.port', 6379);
    this.concurrencyPerApp = this.configService.get<number>(
      'webhook.concurrencyPerApp',
      5,
    );
  }

  async onModuleInit() {
    this.logger.log('Initializing queue consumers...');

    this.appClaimService.onAppClaimed(async (appId) => {
      const app = await this.applicationRepository.findById(appId);
      if (app) {
        this.logger.log(`Claimed app ${app.name} (${appId}), starting consumer`);
        this.startConsumer(app);
      }
    });

    this.appClaimService.onAppReleased(async (appId) => {
      this.logger.log(`Released app ${appId}, stopping consumer`);
      await this.stopConsumer(appId);
    });

    this.redisSubscriberService.onConfigRefresh(
      this.handleConfigRefresh.bind(this),
    );

    // Seed known apps so AppClaimService can begin claiming
    await this.refreshKnownApps();
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
    this.dispatcherService.invalidateCache();

    if (
      signal.type === 'APPLICATION_CREATED' ||
      signal.type === 'APPLICATION_UPDATED' ||
      signal.type === 'APPLICATION_DELETED' ||
      signal.type === 'FULL_REFRESH'
    ) {
      this.logger.log(
        `Config refresh signal received: ${signal.type}, updating known apps...`,
      );
      this.refreshKnownApps().catch((error) => {
        this.logger.error('Failed to refresh known apps', error);
      });
    }
  }

  private async refreshKnownApps() {
    const applications = await this.applicationRepository.findAllActive();
    this.appClaimService.setKnownApps(applications.map((app) => app.id));
  }

  // ── Shared consumer logic ──

  private getQueueName(applicationId: string): string {
    return `${REDIS_CONSTANTS.QUEUE_PREFIX}${applicationId}`;
  }

  private startConsumer(app: ActiveApplication) {
    if (this.consumers.has(app.id)) return;

    const redisConnections: Redis[] = [];
    for (let i = 0; i < this.concurrencyPerApp; i++) {
      redisConnections.push(
        new Redis({
          host: this.redisHost,
          port: this.redisPort,
          maxRetriesPerRequest: null,
          retryStrategy: (times) => {
            if (times > 10 || this.isShuttingDown) {
              return null;
            }
            return Math.min(times * 100, 3000);
          },
        }),
      );
    }

    const consumer: ConsumerLoop = {
      applicationId: app.id,
      running: true,
      redisConnections,
    };

    this.consumers.set(app.id, consumer);

    for (let i = 0; i < redisConnections.length; i++) {
      this.consumeLoop(consumer, redisConnections[i], i).catch((error) => {
        this.logger.error(
          `Consumer loop error for ${app.id} worker ${i}: ${error.message}`,
          error.stack,
        );
      });
    }

    this.logger.log(
      `Started ${redisConnections.length} consumer workers for app ${app.id}`,
    );
  }

  private async stopConsumer(applicationId: string) {
    const consumer = this.consumers.get(applicationId);
    if (!consumer) return;

    consumer.running = false;
    this.consumers.delete(applicationId);

    const quitPromises = consumer.redisConnections.map((redis) =>
      redis.quit().catch(() => {
        this.logger.warn(`Error closing Redis for ${applicationId}`);
      }),
    );
    await Promise.all(quitPromises);
  }

  private async consumeLoop(
    consumer: ConsumerLoop,
    redis: Redis,
    workerIndex: number,
  ) {
    const queueName = this.getQueueName(consumer.applicationId);
    this.logger.log(
      `Starting consume loop for queue: ${queueName} (worker ${workerIndex})`,
    );

    while (consumer.running && !this.isShuttingDown) {
      try {
        const result = await redis.brpop(
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
            `Received message from ${queueName} (worker ${workerIndex}): subscription=${message.subscriptionId}`,
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
          `Error in consume loop for ${queueName} (worker ${workerIndex}): ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        await this.sleep(1000);
      }
    }

    this.logger.log(
      `Consume loop stopped for queue: ${queueName} (worker ${workerIndex})`,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
