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
import { AdminApiService } from './admin-api.service';
import { DispatcherService, DispatchResult } from './dispatcher.service';
import { AppClaimService } from './app-claim.service';

interface ConsumerLoop {
  applicationId: string;
  running: boolean;
  redis: Redis;
  lastPendingRecoveryTime: number;
}

@Injectable()
export class QueueConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueConsumerService.name);
  private consumers: Map<string, ConsumerLoop> = new Map();
  private isShuttingDown = false;
  private static readonly RETRY_INTERVAL_MS = 5000;
  private static readonly MAX_RETRY_LOG_INTERVAL = 6;
  private readonly redisHost: string;
  private readonly redisPort: number;
  private readonly instanceId: string;

  // Stream config
  private readonly blockTimeoutMs: number;
  private readonly minIdleTimeMs: number;
  private readonly pendingRecoveryIntervalMs: number;
  private readonly maxRecoveryPerCycle: number;
  private readonly maxDeliveryCount: number;

  constructor(
    private configService: ConfigService,
    private adminApiService: AdminApiService,
    private dispatcherService: DispatcherService,
    private redisSubscriberService: RedisSubscriberService,
    private appClaimService: AppClaimService,
  ) {
    this.redisHost = this.configService.get<string>('redis.host', 'localhost');
    this.redisPort = this.configService.get<number>('redis.port', 6379);
    this.instanceId = this.configService.get<string>(
      'partitioning.instanceId',
      'dispatcher-default',
    );
    this.blockTimeoutMs = this.configService.get<number>(
      'stream.blockTimeoutMs',
      5000,
    );
    this.minIdleTimeMs = this.configService.get<number>(
      'stream.minIdleTimeMs',
      120_000,
    );
    this.pendingRecoveryIntervalMs = this.configService.get<number>(
      'stream.pendingRecoveryIntervalMs',
      10_000,
    );
    this.maxRecoveryPerCycle = this.configService.get<number>(
      'stream.maxRecoveryPerCycle',
      100,
    );
    this.maxDeliveryCount = this.configService.get<number>(
      'stream.maxDeliveryCount',
      10,
    );
  }

  async onModuleInit() {
    this.logger.log('Initializing stream consumers...');

    this.appClaimService.onAppClaimed(async (appId) => {
      this.logger.log(`Claimed app ${appId}, starting consumer`);
      this.startConsumer(appId);
    });

    this.appClaimService.onAppReleased(async (appId) => {
      this.logger.log(`Released app ${appId}, stopping consumer`);
      await this.stopConsumer(appId);
    });

    this.redisSubscriberService.onConfigRefresh(
      this.handleConfigRefresh.bind(this),
    );

    // Seed known apps in background - don't block startup if admin-api is unavailable
    this.refreshKnownAppsWithRetry().catch((error) => {
      this.logger.error('Unexpected error in refreshKnownAppsWithRetry', error);
    });
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down stream consumers...');
    this.isShuttingDown = true;

    const stopPromises: Promise<void>[] = [];
    for (const [appId] of this.consumers) {
      stopPromises.push(this.stopConsumer(appId));
    }
    await Promise.all(stopPromises);

    this.logger.log('All stream consumers stopped');
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
    const applications = await this.adminApiService.getActiveApplications();
    this.appClaimService.setKnownApps(applications.map((app) => app.id));
  }

  private async refreshKnownAppsWithRetry(): Promise<void> {
    let retryCount = 0;

    while (true) {
      try {
        await this.refreshKnownApps();
        if (retryCount > 0) {
          this.logger.log(
            `Successfully connected to admin-api after ${retryCount} retries`,
          );
        }
        return;
      } catch (error) {
        retryCount++;

        if (
          retryCount === 1 ||
          retryCount % QueueConsumerService.MAX_RETRY_LOG_INTERVAL === 0
        ) {
          this.logger.warn(
            `Failed to fetch known apps from admin-api, retrying... (attempt ${retryCount})`,
          );
        }

        await this.sleep(QueueConsumerService.RETRY_INTERVAL_MS);
      }
    }
  }

  // ── Stream helpers ──

  private getStreamName(applicationId: string): string {
    return `${REDIS_CONSTANTS.STREAM_PREFIX}${applicationId}`;
  }

  private getDlqStreamName(applicationId: string): string {
    return `${REDIS_CONSTANTS.DLQ_STREAM_PREFIX}${applicationId}`;
  }

  private getConsumerName(applicationId: string): string {
    return `${this.instanceId}-${applicationId}`;
  }

  private async ensureConsumerGroup(
    redis: Redis,
    streamName: string,
  ): Promise<void> {
    try {
      await redis.xgroup(
        'CREATE',
        streamName,
        REDIS_CONSTANTS.STREAM_GROUP,
        '0',
        'MKSTREAM',
      );
      this.logger.log(
        `Created consumer group ${REDIS_CONSTANTS.STREAM_GROUP} on ${streamName}`,
      );
    } catch (error: unknown) {
      // BUSYGROUP = group already exists — safe to ignore
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        return;
      }
      throw error;
    }
  }

  // ── Consumer lifecycle ──

  private startConsumer(applicationId: string) {
    if (this.consumers.has(applicationId)) return;

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
      applicationId,
      running: true,
      redis,
      lastPendingRecoveryTime: 0,
    };

    this.consumers.set(applicationId, consumer);

    this.consumeLoop(consumer).catch((error) => {
      this.logger.error(
        `Consumer loop error for ${applicationId}: ${error.message}`,
        error.stack,
      );
    });

    this.logger.log(`Started stream consumer for app ${applicationId}`);
  }

  private async stopConsumer(applicationId: string) {
    const consumer = this.consumers.get(applicationId);
    if (!consumer) return;

    consumer.running = false;
    this.consumers.delete(applicationId);

    await consumer.redis.quit().catch(() => {
      this.logger.warn(`Error closing Redis for ${applicationId}`);
    });
  }

  // ── Main consume loop ──

  private async consumeLoop(consumer: ConsumerLoop) {
    const streamName = this.getStreamName(consumer.applicationId);
    const groupName = REDIS_CONSTANTS.STREAM_GROUP;
    const consumerName = this.getConsumerName(consumer.applicationId);

    await this.ensureConsumerGroup(consumer.redis, streamName);

    this.logger.log(
      `Starting consume loop for stream: ${streamName} (consumer: ${consumerName})`,
    );

    while (consumer.running && !this.isShuttingDown) {
      try {
        // Phase 1: Periodic pending message recovery
        const now = Date.now();
        if (
          now - consumer.lastPendingRecoveryTime >=
          this.pendingRecoveryIntervalMs
        ) {
          await this.recoverPendingMessages(consumer);
          consumer.lastPendingRecoveryTime = Date.now();
        }

        // Phase 2: Read new messages
        const response = await consumer.redis.xreadgroup(
          'GROUP',
          groupName,
          consumerName,
          'COUNT',
          1,
          'BLOCK',
          this.blockTimeoutMs,
          'STREAMS',
          streamName,
          '>',
        );

        if (!response) continue;

        // Phase 3: Process messages
        // response: [[streamName, [[messageId, [field, value, ...]], ...]]]
        const streamEntry = response[0] as [string, Array<[string, string[]]>];
        const messages = streamEntry[1];
        for (const [messageId, fields] of messages) {
          await this.processMessage(
            consumer,
            streamName,
            groupName,
            messageId,
            fields,
          );
        }
      } catch (error) {
        if (
          this.isShuttingDown ||
          !consumer.running ||
          (error instanceof Error &&
            (error.message.includes('Connection is closed') ||
              error.message.includes("Stream isn't writeable")))
        ) {
          break;
        }

        this.logger.error(
          `Error in consume loop for ${streamName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );

        await this.sleep(1000);
      }
    }

    this.logger.log(`Consume loop stopped for stream: ${streamName}`);
  }

  private async processMessage(
    consumer: ConsumerLoop,
    streamName: string,
    groupName: string,
    messageId: string,
    fields: string[],
  ): Promise<void> {
    // fields is flat array: ['data', '{"..."}']
    const dataIndex = fields.indexOf('data');
    if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
      this.logger.error(
        `Invalid stream message format in ${streamName}: ${messageId}`,
      );
      await consumer.redis.xack(streamName, groupName, messageId);
      return;
    }

    const rawData = fields[dataIndex + 1];

    let message: EventQueueMessage;
    try {
      message = JSON.parse(rawData);
    } catch {
      this.logger.error(
        `Failed to parse message ${messageId} from ${streamName}: ${rawData}`,
      );
      await consumer.redis.xack(streamName, groupName, messageId);
      return;
    }

    this.logger.debug(
      `Processing message ${messageId} from ${streamName}: subscription=${message.subscriptionId}`,
    );

    try {
      const result: DispatchResult =
        await this.dispatcherService.dispatch(message);

      if (result === 'success' || result === 'non_retryable') {
        await consumer.redis.xack(streamName, groupName, messageId);
      }
      // 'retryable_failure' → leave in PEL for XAUTOCLAIM recovery
    } catch (error) {
      this.logger.error(
        `Unhandled error dispatching message ${messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Leave in PEL for XAUTOCLAIM recovery
    }
  }

  // ── XAUTOCLAIM recovery ──

  private async recoverPendingMessages(consumer: ConsumerLoop): Promise<void> {
    const streamName = this.getStreamName(consumer.applicationId);
    const groupName = REDIS_CONSTANTS.STREAM_GROUP;
    const consumerName = this.getConsumerName(consumer.applicationId);
    const dlqStreamName = this.getDlqStreamName(consumer.applicationId);

    let cursor = '0-0';
    let processedCount = 0;

    while (consumer.running && processedCount < this.maxRecoveryPerCycle) {
      try {
        // XAUTOCLAIM returns [nextCursor, claimedMessages, deletedIds]
        const result = (await consumer.redis.xautoclaim(
          streamName,
          groupName,
          consumerName,
          this.minIdleTimeMs,
          cursor,
          'COUNT',
          20,
        )) as [string, Array<[string, string[]]>, string[]];

        const [nextCursor, claimedMessages, deletedIds] = result;

        // Clean up deleted message IDs from PEL
        if (deletedIds && deletedIds.length > 0) {
          await consumer.redis.xack(streamName, groupName, ...deletedIds);
        }

        if (!claimedMessages || claimedMessages.length === 0) {
          break;
        }

        for (const [messageId, fields] of claimedMessages) {
          if (!consumer.running || processedCount >= this.maxRecoveryPerCycle) {
            break;
          }

          // Check delivery count via XPENDING for this specific message
          const deliveryCount = await this.getDeliveryCount(
            consumer.redis,
            streamName,
            groupName,
            messageId,
          );

          if (deliveryCount > this.maxDeliveryCount) {
            // Move to DLQ
            await this.moveToDlq(
              consumer.redis,
              streamName,
              groupName,
              dlqStreamName,
              messageId,
              fields,
              deliveryCount,
            );
            this.logger.warn(
              `Message ${messageId} moved to DLQ after ${deliveryCount} delivery attempts`,
            );
          } else {
            // Retry dispatch
            await this.processMessage(
              consumer,
              streamName,
              groupName,
              messageId,
              fields,
            );
          }

          processedCount++;
        }

        // '0-0' means no more pending messages to claim
        if (nextCursor === '0-0') {
          break;
        }
        cursor = nextCursor;
      } catch (error) {
        this.logger.error(
          `Error recovering pending messages for ${streamName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        break;
      }
    }

    if (processedCount > 0) {
      this.logger.log(
        `Recovered ${processedCount} pending messages for ${consumer.applicationId}`,
      );
    }
  }

  private async getDeliveryCount(
    redis: Redis,
    streamName: string,
    groupName: string,
    messageId: string,
  ): Promise<number> {
    try {
      // XPENDING stream group start end count — query for the specific message
      const pending = (await redis.xpending(
        streamName,
        groupName,
        messageId,
        messageId,
        1,
      )) as Array<[string, string, number, number]>;

      if (pending && pending.length > 0) {
        // [messageId, consumer, idleTime, deliveryCount]
        return pending[0][3];
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private async moveToDlq(
    redis: Redis,
    streamName: string,
    groupName: string,
    dlqStreamName: string,
    messageId: string,
    fields: string[],
    deliveryCount: number,
  ): Promise<void> {
    // Add to DLQ stream with original data + metadata
    await redis.xadd(
      dlqStreamName,
      '*',
      'data',
      fields[fields.indexOf('data') + 1],
      'originalStream',
      streamName,
      'originalMessageId',
      messageId,
      'deliveryCount',
      deliveryCount.toString(),
      'movedAt',
      Date.now().toString(),
    );

    // ACK from original stream to remove from PEL
    await redis.xack(streamName, groupName, messageId);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
