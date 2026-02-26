import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CONSTANTS } from '../../common/constants/redis.constants';
import { AppClaimService } from './app-claim.service';

@Injectable()
export class StreamMaintenanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StreamMaintenanceService.name);
  private redis: Redis;
  private timer: NodeJS.Timeout | null = null;
  private readonly trimIntervalMs: number;
  private readonly retentionMs: number;
  private readonly dlqRetentionMs: number;
  private readonly emergencyMaxLen: number;
  private readonly staleConsumerIdleMs = 3_600_000; // 1 hour

  constructor(
    private configService: ConfigService,
    private appClaimService: AppClaimService,
  ) {
    this.trimIntervalMs = this.configService.get<number>(
      'stream.trimIntervalMs',
      300_000,
    );
    this.retentionMs = this.configService.get<number>(
      'stream.retentionMs',
      86_400_000,
    );
    this.dlqRetentionMs = this.configService.get<number>(
      'stream.dlqRetentionMs',
      604_800_000,
    );
    this.emergencyMaxLen = this.configService.get<number>(
      'stream.emergencyMaxLen',
      1_000_000,
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
  }

  onModuleInit() {
    this.logger.log(
      `Starting stream maintenance (interval: ${this.trimIntervalMs}ms)`,
    );
    this.timer = setInterval(() => {
      this.performMaintenance().catch((error) => {
        this.logger.error(`Stream maintenance failed: ${error.message}`);
      });
    }, this.trimIntervalMs);
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.redis.quit().catch(() => {});
    this.logger.log('Stream maintenance service stopped');
  }

  private async performMaintenance(): Promise<void> {
    const claimedAppIds = this.appClaimService.getClaimedAppIds();

    for (const appId of claimedAppIds) {
      try {
        await this.maintainStream(appId);
      } catch (error) {
        this.logger.error(
          `Maintenance failed for app ${appId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  private async maintainStream(appId: string): Promise<void> {
    const streamName = `${REDIS_CONSTANTS.STREAM_PREFIX}${appId}`;
    const dlqStreamName = `${REDIS_CONSTANTS.DLQ_STREAM_PREFIX}${appId}`;
    const groupName = REDIS_CONSTANTS.STREAM_GROUP;

    // 1. Trim main stream by time-based MINID
    const cutoffTimestamp = Date.now() - this.retentionMs;
    const cutoffId = `${cutoffTimestamp}-0`;
    try {
      await this.redis.xtrim(streamName, 'MINID', '~', cutoffId);
    } catch {
      // Stream may not exist yet — safe to ignore
    }

    // 2. Trim DLQ stream
    const dlqCutoffTimestamp = Date.now() - this.dlqRetentionMs;
    const dlqCutoffId = `${dlqCutoffTimestamp}-0`;
    try {
      await this.redis.xtrim(dlqStreamName, 'MINID', '~', dlqCutoffId);
    } catch {
      // DLQ stream may not exist — safe to ignore
    }

    // 3. Emergency cap on main stream
    try {
      const len = await this.redis.xlen(streamName);
      if (len > this.emergencyMaxLen) {
        await this.redis.xtrim(streamName, 'MAXLEN', '~', this.emergencyMaxLen);
        this.logger.warn(
          `Emergency trim on ${streamName}: ${len} -> ~${this.emergencyMaxLen}`,
        );
      }
    } catch {
      // Ignore if stream doesn't exist
    }

    // 4. Log pending count for monitoring
    try {
      const pendingInfo = (await this.redis.xpending(
        streamName,
        groupName,
      )) as [number, string | null, string | null, Array<[string, number]> | null];
      const pendingCount = pendingInfo[0];
      if (pendingCount > 0) {
        this.logger.log(
          `Stream ${streamName}: ${pendingCount} pending messages`,
        );
      }
    } catch {
      // Group may not exist yet
    }

    // 5. Clean up stale consumers (idle > 1h, pending = 0)
    try {
      const consumers = (await this.redis.xinfo(
        'CONSUMERS',
        streamName,
        groupName,
      )) as Array<unknown[]>;

      for (const consumerInfo of consumers) {
        const info = this.parseXinfoConsumer(consumerInfo);
        if (!info) continue;

        if (
          info.idle > this.staleConsumerIdleMs &&
          info.pending === 0
        ) {
          await this.redis.xgroup(
            'DELCONSUMER',
            streamName,
            groupName,
            info.name,
          );
          this.logger.log(
            `Removed stale consumer ${info.name} from ${streamName} (idle: ${Math.round(info.idle / 1000)}s)`,
          );
        }
      }
    } catch {
      // Group or stream may not exist
    }
  }

  private parseXinfoConsumer(
    raw: unknown[],
  ): { name: string; pending: number; idle: number } | null {
    // XINFO CONSUMERS returns flat key-value pairs:
    // ['name', 'consumer-1', 'pending', 5, 'idle', 12345, ...]
    try {
      const map = new Map<string, unknown>();
      for (let i = 0; i < raw.length; i += 2) {
        map.set(String(raw[i]), raw[i + 1]);
      }
      return {
        name: String(map.get('name')),
        pending: Number(map.get('pending')),
        idle: Number(map.get('idle')),
      };
    } catch {
      return null;
    }
  }
}
