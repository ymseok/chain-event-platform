import Redis from 'ioredis';
import { Config } from '../config';
import { createLogger } from './logger.service';

const logger = createLogger('AppClaim');

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

const INSTANCE_KEY_PREFIX = 'ingestor:instance:';
const INSTANCE_JOINED_CHANNEL = 'ingestor:joined';

export class AppClaimService {
  private redis: Redis;
  private subscriber: Redis;
  private instanceId: string;
  private leaseTtlSec: number;
  private claimIntervalMs: number;
  private claimTimer: NodeJS.Timeout | null = null;
  private knownAppIds: Set<string> = new Set();
  private claimedAppIds: Set<string> = new Set();
  private onClaimedHandlers: AppClaimedHandler[] = [];
  private onReleasedHandlers: AppReleasedHandler[] = [];
  private isRunning = false;
  private lastKnownInstanceCount = 0;
  private isRebalancing = false;

  constructor(private config: Config) {
    this.instanceId = config.partitioning.instanceId;
    this.leaseTtlSec = config.partitioning.leaseTtlSec;
    this.claimIntervalMs = config.partitioning.claimIntervalMs;

    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    // Separate connection for Pub/Sub (ioredis requires dedicated connection)
    this.subscriber = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        logger.info(`Reconnecting subscriber in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Connected to Redis for app claim management');
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message });
    });

    this.subscriber.on('error', (error) => {
      logger.error('Redis subscriber error', { error: error.message });
    });
  }

  /**
   * Register a handler called when an app is claimed by this instance
   */
  onAppClaimed(handler: AppClaimedHandler): void {
    this.onClaimedHandlers.push(handler);
  }

  /**
   * Register a handler called when an app is released by this instance
   */
  onAppReleased(handler: AppReleasedHandler): void {
    this.onReleasedHandlers.push(handler);
  }

  /**
   * Set the list of known application IDs to attempt to claim
   */
  setKnownApps(appIds: string[]): void {
    this.knownAppIds = new Set(appIds);
    logger.info(`Updated known apps: ${appIds.length} applications`);
  }

  /**
   * Get the set of currently claimed app IDs
   */
  getClaimedAppIds(): Set<string> {
    return new Set(this.claimedAppIds);
  }

  /**
   * Start the claim loop
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info(`Starting app claim service (instance: ${this.instanceId}, ttl: ${this.leaseTtlSec}s, interval: ${this.claimIntervalMs}ms)`);

    // Register this instance in Redis
    await this.registerInstance();

    // Subscribe to instance join events before publishing our own
    await this.subscribeToJoinEvents();

    // Run initial claim cycle immediately
    await this.claimCycle();

    // Announce our presence so existing instances can rebalance
    await this.publishJoinEvent();

    // Schedule periodic claim cycles
    this.claimTimer = setInterval(() => {
      this.claimCycle().catch((error) => {
        logger.error('Claim cycle failed', { error });
      });
    }, this.claimIntervalMs);
  }

  /**
   * Stop the claim loop and release all claims
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.claimTimer) {
      clearInterval(this.claimTimer);
      this.claimTimer = null;
    }

    // Release all claims gracefully
    for (const appId of this.claimedAppIds) {
      await this.releaseClaim(appId);
    }

    // Unregister this instance
    await this.redis.del(this.getInstanceKey());

    await this.subscriber.unsubscribe(INSTANCE_JOINED_CHANNEL);
    await this.subscriber.quit();
    await this.redis.quit();
    logger.info('App claim service stopped, all claims released');
  }

  /**
   * Get the Redis key for an app claim
   */
  private getClaimKey(appId: string): string {
    return `ingestor:claim:${appId}`;
  }

  /**
   * Run one claim cycle: heartbeat, self-rebalance, try to claim unclaimed apps, renew existing claims
   */
  private async claimCycle(): Promise<void> {
    // 0. Renew instance heartbeat
    await this.renewInstanceHeartbeat();

    // 1. Self-rebalance check (fallback in case Pub/Sub message was missed)
    await this.selfRebalanceIfNeeded();

    // 2. Try to claim unclaimed apps (up to target)
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
          logger.info(`Claimed app ${appId}`);

          for (const handler of this.onClaimedHandlers) {
            try {
              await handler(appId);
            } catch (error) {
              logger.error(`Error in onAppClaimed handler for app ${appId}`, { error });
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to claim app ${appId}`, { error });
      }
    }

    // 3. Renew existing claims
    for (const appId of this.claimedAppIds) {
      // If the app is no longer in knownApps, release it
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
          // We lost the claim (someone else took it or it expired)
          this.claimedAppIds.delete(appId);
          logger.warn(`Lost claim on app ${appId}`);

          for (const handler of this.onReleasedHandlers) {
            try {
              await handler(appId);
            } catch (error) {
              logger.error(`Error in onAppReleased handler for app ${appId}`, { error });
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to renew claim for app ${appId}`, { error });
      }
    }
  }

  /**
   * Release a single claim (with ownership check)
   */
  private async releaseClaim(appId: string): Promise<void> {
    try {
      await this.redis.eval(
        RELEASE_SCRIPT,
        1,
        this.getClaimKey(appId),
        this.instanceId,
      );

      this.claimedAppIds.delete(appId);
      logger.info(`Released claim on app ${appId}`);

      for (const handler of this.onReleasedHandlers) {
        try {
          await handler(appId);
        } catch (error) {
          logger.error(`Error in onAppReleased handler for app ${appId}`, { error });
        }
      }
    } catch (error) {
      logger.error(`Failed to release claim for app ${appId}`, { error });
    }
  }

  // ── Instance registry & auto-rebalance ──

  private getInstanceKey(): string {
    return `${INSTANCE_KEY_PREFIX}${this.instanceId}`;
  }

  /**
   * Register this instance in Redis with a TTL-based heartbeat
   */
  private async registerInstance(): Promise<void> {
    await this.redis.set(this.getInstanceKey(), '1', 'EX', this.leaseTtlSec);
    logger.info(`Registered instance ${this.instanceId}`);
  }

  /**
   * Renew instance heartbeat TTL
   */
  private async renewInstanceHeartbeat(): Promise<void> {
    try {
      await this.redis.set(this.getInstanceKey(), '1', 'EX', this.leaseTtlSec);
    } catch (error) {
      logger.error('Failed to renew instance heartbeat', { error });
    }
  }

  /**
   * Subscribe to the instance-joined Pub/Sub channel
   */
  private async subscribeToJoinEvents(): Promise<void> {
    await this.subscriber.subscribe(INSTANCE_JOINED_CHANNEL);
    logger.info(`Subscribed to channel: ${INSTANCE_JOINED_CHANNEL}`);

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== INSTANCE_JOINED_CHANNEL) return;

      try {
        const { instanceId } = JSON.parse(message) as { instanceId: string };

        // Ignore our own join event
        if (instanceId === this.instanceId) return;

        logger.info(`Instance joined: ${instanceId}, triggering rebalance`);
        await this.selfRebalance();
      } catch (error) {
        logger.error('Failed to handle join event', { error });
      }
    });
  }

  /**
   * Publish join event so existing instances can rebalance
   */
  private async publishJoinEvent(): Promise<void> {
    const payload = JSON.stringify({
      instanceId: this.instanceId,
      timestamp: Date.now(),
    });
    await this.redis.publish(INSTANCE_JOINED_CHANNEL, payload);
    logger.info('Published join event');
  }

  /**
   * Count active ingestor instances via SCAN
   */
  private async countInstances(): Promise<number> {
    const instanceIds = new Set<string>();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${INSTANCE_KEY_PREFIX}*`,
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

  /**
   * Calculate the target number of claims per instance
   */
  private async getClaimTarget(): Promise<number> {
    const totalApps = this.knownAppIds.size;
    if (totalApps === 0) return 0;

    const instanceCount = await this.countInstances();
    if (instanceCount <= 1) return totalApps;

    this.lastKnownInstanceCount = instanceCount;
    return Math.ceil(totalApps / instanceCount);
  }

  /**
   * Fallback: check if instance count changed and rebalance if needed
   */
  private async selfRebalanceIfNeeded(): Promise<void> {
    const currentCount = await this.countInstances();
    if (currentCount === this.lastKnownInstanceCount) return;

    const previousCount = this.lastKnownInstanceCount;
    this.lastKnownInstanceCount = currentCount;

    if (currentCount > previousCount) {
      logger.info(
        `Instance count changed: ${previousCount} → ${currentCount}, triggering rebalance`,
      );
      await this.selfRebalance();
    }
  }

  /**
   * Release excess claims so other instances can pick them up
   */
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

      logger.info(
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

      logger.info(`Self-rebalance complete: released ${excess} claim(s)`);
    } catch (error) {
      logger.error('Self-rebalance failed', { error });
    } finally {
      this.isRebalancing = false;
    }
  }
}
