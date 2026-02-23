import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONSTANTS } from '../../common/constants/redis.constants';

type AppClaimedHandler = (appId: string) => Promise<void>;
type AppReleasedHandler = (appId: string) => Promise<void>;

// Lua script: renew lease only if we still own it
const RENEW_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
  return 1
else
  return 0
end
`;

// Lua script: release claim only if we still own it
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("DEL", KEYS[1])
  return 1
else
  return 0
end
`;

@Injectable()
export class AppClaimService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppClaimService.name);
  private redis: Redis;
  private subscriber: Redis;
  private readonly instanceId: string;
  private readonly leaseTtlSec: number;
  private readonly claimIntervalMs: number;
  private claimTimer: NodeJS.Timeout | null = null;
  private knownAppIds: Set<string> = new Set();
  private claimedAppIds: Set<string> = new Set();
  private onClaimedHandlers: AppClaimedHandler[] = [];
  private onReleasedHandlers: AppReleasedHandler[] = [];
  private isRunning = false;
  private lastKnownInstanceCount = 0;
  private isRebalancing = false;

  constructor(private configService: ConfigService) {
    this.instanceId = this.configService.get<string>(
      'partitioning.instanceId',
      'dispatcher-default',
    );
    this.leaseTtlSec = this.configService.get<number>(
      'partitioning.leaseTtlSec',
      30,
    );
    this.claimIntervalMs = this.configService.get<number>(
      'partitioning.claimIntervalMs',
      5000,
    );

    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);

    this.redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    this.subscriber = new Redis({
      host,
      port,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        this.logger.log(
          `Reconnecting subscriber in ${delay}ms (attempt ${times})`,
        );
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });

    this.subscriber.on('error', (error) => {
      this.logger.error(`Redis subscriber error: ${error.message}`);
    });
  }

  onAppClaimed(handler: AppClaimedHandler): void {
    this.onClaimedHandlers.push(handler);
  }

  onAppReleased(handler: AppReleasedHandler): void {
    this.onReleasedHandlers.push(handler);
  }

  setKnownApps(appIds: string[]): void {
    this.knownAppIds = new Set(appIds);
    this.logger.log(`Updated known apps: ${appIds.length} applications`);
  }

  getClaimedAppIds(): Set<string> {
    return new Set(this.claimedAppIds);
  }

  async onModuleInit() {
    this.logger.log(
      `Starting app claim service (instance: ${this.instanceId}, ttl: ${this.leaseTtlSec}s, interval: ${this.claimIntervalMs}ms)`,
    );

    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  private async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.registerInstance();
    await this.subscribeToJoinEvents();
    await this.claimCycle();
    await this.publishJoinEvent();

    this.claimTimer = setInterval(() => {
      this.claimCycle().catch((error) => {
        this.logger.error(`Claim cycle failed: ${error}`);
      });
    }, this.claimIntervalMs);
  }

  private async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.claimTimer) {
      clearInterval(this.claimTimer);
      this.claimTimer = null;
    }

    for (const appId of this.claimedAppIds) {
      await this.releaseClaim(appId);
    }

    await this.redis.del(this.getInstanceKey());
    await this.subscriber.unsubscribe(
      REDIS_CONSTANTS.DISPATCHER_JOINED_CHANNEL,
    );
    await this.subscriber.quit();
    await this.redis.quit();
    this.logger.log('App claim service stopped, all claims released');
  }

  private getClaimKey(appId: string): string {
    return `${REDIS_CONSTANTS.DISPATCHER_CLAIM_PREFIX}${appId}`;
  }

  private getInstanceKey(): string {
    return `${REDIS_CONSTANTS.DISPATCHER_INSTANCE_PREFIX}${this.instanceId}`;
  }

  private async claimCycle(): Promise<void> {
    await this.renewInstanceHeartbeat();
    await this.selfRebalanceIfNeeded();

    const target = await this.getClaimTarget();
    for (const appId of this.knownAppIds) {
      if (this.claimedAppIds.has(appId)) continue;
      if (this.claimedAppIds.size >= target) break;

      try {
        const result = await this.redis.set(
          this.getClaimKey(appId),
          this.instanceId,
          'EX',
          this.leaseTtlSec,
          'NX',
        );

        if (result === 'OK') {
          this.claimedAppIds.add(appId);
          this.logger.log(`Claimed app ${appId}`);

          for (const handler of this.onClaimedHandlers) {
            try {
              await handler(appId);
            } catch (error) {
              this.logger.error(
                `Error in onAppClaimed handler for app ${appId}: ${error}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to claim app ${appId}: ${error}`);
      }
    }

    for (const appId of this.claimedAppIds) {
      if (!this.knownAppIds.has(appId)) {
        await this.releaseClaim(appId);
        continue;
      }

      try {
        const result = await this.redis.eval(
          RENEW_SCRIPT,
          1,
          this.getClaimKey(appId),
          this.instanceId,
          this.leaseTtlSec.toString(),
        );

        if (result === 0) {
          this.claimedAppIds.delete(appId);
          this.logger.warn(`Lost claim on app ${appId}`);

          for (const handler of this.onReleasedHandlers) {
            try {
              await handler(appId);
            } catch (error) {
              this.logger.error(
                `Error in onAppReleased handler for app ${appId}: ${error}`,
              );
            }
          }
        }
      } catch (error) {
        this.logger.error(`Failed to renew claim for app ${appId}: ${error}`);
      }
    }
  }

  private async releaseClaim(appId: string): Promise<void> {
    try {
      await this.redis.eval(
        RELEASE_SCRIPT,
        1,
        this.getClaimKey(appId),
        this.instanceId,
      );

      this.claimedAppIds.delete(appId);
      this.logger.log(`Released claim on app ${appId}`);

      for (const handler of this.onReleasedHandlers) {
        try {
          await handler(appId);
        } catch (error) {
          this.logger.error(
            `Error in onAppReleased handler for app ${appId}: ${error}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to release claim for app ${appId}: ${error}`);
    }
  }

  private async registerInstance(): Promise<void> {
    await this.redis.set(this.getInstanceKey(), '1', 'EX', this.leaseTtlSec);
    this.logger.log(`Registered instance ${this.instanceId}`);
  }

  private async renewInstanceHeartbeat(): Promise<void> {
    try {
      await this.redis.set(this.getInstanceKey(), '1', 'EX', this.leaseTtlSec);
    } catch (error) {
      this.logger.error(`Failed to renew instance heartbeat: ${error}`);
    }
  }

  private async subscribeToJoinEvents(): Promise<void> {
    await this.subscriber.subscribe(
      REDIS_CONSTANTS.DISPATCHER_JOINED_CHANNEL,
    );
    this.logger.log(
      `Subscribed to channel: ${REDIS_CONSTANTS.DISPATCHER_JOINED_CHANNEL}`,
    );

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== REDIS_CONSTANTS.DISPATCHER_JOINED_CHANNEL) return;

      try {
        const { instanceId } = JSON.parse(message) as { instanceId: string };
        if (instanceId === this.instanceId) return;

        this.logger.log(
          `Instance joined: ${instanceId}, triggering rebalance`,
        );
        await this.selfRebalance();
      } catch (error) {
        this.logger.error(`Failed to handle join event: ${error}`);
      }
    });
  }

  private async publishJoinEvent(): Promise<void> {
    const payload = JSON.stringify({
      instanceId: this.instanceId,
      timestamp: Date.now(),
    });
    await this.redis.publish(
      REDIS_CONSTANTS.DISPATCHER_JOINED_CHANNEL,
      payload,
    );
    this.logger.log('Published join event');
  }

  private async countInstances(): Promise<number> {
    const instanceIds = new Set<string>();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${REDIS_CONSTANTS.DISPATCHER_INSTANCE_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      for (const key of keys) {
        instanceIds.add(key);
      }
    } while (cursor !== '0');
    return instanceIds.size;
  }

  private async getClaimTarget(): Promise<number> {
    const totalApps = this.knownAppIds.size;
    if (totalApps === 0) return 0;

    const instanceCount = await this.countInstances();
    if (instanceCount <= 1) return totalApps;

    this.lastKnownInstanceCount = instanceCount;
    return Math.ceil(totalApps / instanceCount);
  }

  private async selfRebalanceIfNeeded(): Promise<void> {
    const currentCount = await this.countInstances();
    if (currentCount === this.lastKnownInstanceCount) return;

    const previousCount = this.lastKnownInstanceCount;
    this.lastKnownInstanceCount = currentCount;

    if (currentCount > previousCount) {
      this.logger.log(
        `Instance count changed: ${previousCount} -> ${currentCount}, triggering rebalance`,
      );
      await this.selfRebalance();
    }
  }

  private async selfRebalance(): Promise<void> {
    if (this.isRebalancing) return;
    this.isRebalancing = true;

    try {
      const totalApps = this.knownAppIds.size;
      const instanceCount = await this.countInstances();
      this.lastKnownInstanceCount = instanceCount;

      if (instanceCount <= 1 || totalApps === 0) return;

      const target = Math.ceil(totalApps / instanceCount);
      const excess = this.claimedAppIds.size - target;

      if (excess <= 0) return;

      this.logger.log(
        `Self-rebalance: holding ${this.claimedAppIds.size}, target ${target}, releasing ${excess}`,
      );

      // Batch TTL queries in a single pipeline round-trip
      const claimedArray = [...this.claimedAppIds];
      const pipeline = this.redis.pipeline();
      for (const appId of claimedArray) {
        pipeline.ttl(this.getClaimKey(appId));
      }
      const ttlResults = await pipeline.exec();

      const claimsWithTtl: { appId: string; ttl: number }[] = claimedArray.map(
        (appId, i) => ({
          appId,
          ttl: (ttlResults![i][1] as number) ?? 0,
        }),
      );
      claimsWithTtl.sort((a, b) => a.ttl - b.ttl);

      for (let i = 0; i < excess; i++) {
        await this.releaseClaim(claimsWithTtl[i].appId);
      }

      this.logger.log(`Self-rebalance complete: released ${excess} claim(s)`);
    } catch (error) {
      this.logger.error(`Self-rebalance failed: ${error}`);
    } finally {
      this.isRebalancing = false;
    }
  }
}
