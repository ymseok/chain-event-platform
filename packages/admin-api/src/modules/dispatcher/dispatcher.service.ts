import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import {
  DispatcherInstancesResponseDto,
  DispatcherRebalanceResponseDto,
} from './dto';

const CLAIM_KEY_PREFIX = 'dispatcher:claim:';

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getInstances(): Promise<DispatcherInstancesResponseDto> {
    const claimKeys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        `${CLAIM_KEY_PREFIX}*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;
      claimKeys.push(...keys);
    } while (cursor !== '0');

    const allApps = await this.prisma.application.findMany({
      select: { id: true, name: true },
    });
    const appNameMap = new Map(allApps.map((app) => [app.id, app.name]));

    const instanceMap = new Map<
      string,
      { appId: string; appName: string; leaseTtlRemaining: number }[]
    >();
    const claimedAppIds = new Set<string>();

    for (const key of claimKeys) {
      const appId = key.slice(CLAIM_KEY_PREFIX.length);
      const [instanceId, ttl] = await Promise.all([
        this.redis.get(key),
        this.redis.ttl(key),
      ]);

      if (!instanceId) continue;

      claimedAppIds.add(appId);
      const apps = instanceMap.get(instanceId) ?? [];
      apps.push({
        appId,
        appName: appNameMap.get(appId) ?? appId,
        leaseTtlRemaining: ttl > 0 ? ttl : 0,
      });
      instanceMap.set(instanceId, apps);
    }

    const instances = Array.from(instanceMap.entries()).map(
      ([instanceId, claimedApps]) => ({ instanceId, claimedApps }),
    );

    const unclaimedApps = allApps
      .filter((app) => !claimedAppIds.has(app.id))
      .map((app) => ({ appId: app.id, appName: app.name }));

    return { instances, unclaimedApps };
  }

  async rebalance(): Promise<DispatcherRebalanceResponseDto> {
    const { instances, unclaimedApps } = await this.getInstances();
    const totalInstances = instances.length;

    if (totalInstances <= 1) {
      const totalApps =
        instances.reduce((sum, i) => sum + i.claimedApps.length, 0) +
        unclaimedApps.length;
      return {
        message: 'Rebalance skipped: need at least 2 instances',
        released: 0,
        totalApps,
        totalInstances,
      };
    }

    const totalApps =
      instances.reduce((sum, i) => sum + i.claimedApps.length, 0) +
      unclaimedApps.length;
    const target = Math.ceil(totalApps / totalInstances);

    let released = 0;
    for (const instance of instances) {
      if (instance.claimedApps.length <= target) continue;

      const sorted = [...instance.claimedApps].sort(
        (a, b) => a.leaseTtlRemaining - b.leaseTtlRemaining,
      );
      const excess = instance.claimedApps.length - target;
      const toRelease = sorted.slice(0, excess);

      for (const app of toRelease) {
        const key = `${CLAIM_KEY_PREFIX}${app.appId}`;
        await this.redis.del(key);
        released++;
        this.logger.log(
          `Released claim for app ${app.appId} from instance ${instance.instanceId}`,
        );
      }
    }

    return {
      message: `Rebalance complete: released ${released} claim(s)`,
      released,
      totalApps,
      totalInstances,
    };
  }
}
