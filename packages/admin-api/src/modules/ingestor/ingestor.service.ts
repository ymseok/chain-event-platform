import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../../database/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import {
  IngestorChainDto,
  IngestorSubscriptionDto,
  IngestorSubscriptionsResponseDto,
  IngestorInstancesResponseDto,
  RebalanceResponseDto,
} from './dto';

const CLAIM_KEY_PREFIX = 'ingestor:claim:';

@Injectable()
export class IngestorService {
  private readonly logger = new Logger(IngestorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getSubscriptions(): Promise<IngestorSubscriptionsResponseDto> {
    // Get all enabled chains
    const chains = await this.prisma.chain.findMany({
      where: { enabled: true },
      orderBy: { id: 'asc' },
    });

    // Get all active subscriptions with related data
    const subscriptions = await this.prisma.eventSubscription.findMany({
      where: {
        status: 'ACTIVE',
        event: {
          program: {
            status: 'ACTIVE',
            chain: {
              enabled: true,
            },
          },
        },
        webhook: {
          status: 'ACTIVE',
        },
      },
      include: {
        event: {
          include: {
            program: {
              include: {
                chain: true,
              },
            },
          },
        },
        webhook: true,
      },
    });

    const chainDtos: IngestorChainDto[] = chains.map((chain) => ({
      id: chain.id,
      chainId: chain.chainId,
      name: chain.name,
      rpcUrl: chain.rpcUrl,
      blockTime: chain.blockTime,
      enabled: chain.enabled,
    }));

    const subscriptionDtos: IngestorSubscriptionDto[] = subscriptions.map((sub) => ({
      id: sub.id,
      eventSignature: sub.event.signature,
      eventName: sub.event.name,
      contractAddress: sub.event.program.contractAddress,
      chainId: sub.event.program.chainId,
      networkChainId: sub.event.program.chain.chainId,
      applicationId: sub.webhook.applicationId,
      webhookId: sub.webhookId,
      filterConditions: sub.filterConditions,
      abi: sub.event.program.abi,
      eventParameters: sub.event.parameters,
    }));

    return {
      chains: chainDtos,
      subscriptions: subscriptionDtos,
    };
  }

  async getSubscriptionsByChainId(
    chainId: number,
  ): Promise<IngestorSubscriptionDto[]> {
    const subscriptions = await this.prisma.eventSubscription.findMany({
      where: {
        status: 'ACTIVE',
        event: {
          program: {
            chainId,
            status: 'ACTIVE',
          },
        },
        webhook: {
          status: 'ACTIVE',
        },
      },
      include: {
        event: {
          include: {
            program: {
              include: {
                chain: true,
              },
            },
          },
        },
        webhook: true,
      },
    });

    return subscriptions.map((sub) => ({
      id: sub.id,
      eventSignature: sub.event.signature,
      eventName: sub.event.name,
      contractAddress: sub.event.program.contractAddress,
      chainId: sub.event.program.chainId,
      networkChainId: sub.event.program.chain.chainId,
      applicationId: sub.webhook.applicationId,
      webhookId: sub.webhookId,
      filterConditions: sub.filterConditions,
      abi: sub.event.program.abi,
      eventParameters: sub.event.parameters,
    }));
  }

  async getInstances(): Promise<IngestorInstancesResponseDto> {
    // Scan all ingestor claim keys
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

    // Get all applications for name lookup
    const allApps = await this.prisma.application.findMany({
      select: { id: true, name: true },
    });
    const appNameMap = new Map(allApps.map((app) => [app.id, app.name]));

    // Build instance map: instanceId -> claimed apps
    const instanceMap = new Map<
      string,
      { appId: string; appName: string; leaseTtlRemaining: number }[]
    >();
    const claimedAppIds = new Set<string>();

    // Batch GET + TTL for all claim keys in a single pipeline round-trip
    if (claimKeys.length > 0) {
      const pipeline = this.redis.pipeline();
      for (const key of claimKeys) {
        pipeline.get(key);
        pipeline.ttl(key);
      }
      const responses = await pipeline.exec();

      for (let i = 0; i < claimKeys.length; i++) {
        const key = claimKeys[i];
        const appId = key.slice(CLAIM_KEY_PREFIX.length);
        const [getErr, instanceId] = responses![i * 2];
        const [ttlErr, ttl] = responses![i * 2 + 1];

        if (getErr || !instanceId) continue;

        claimedAppIds.add(appId);
        const apps = instanceMap.get(instanceId as string) ?? [];
        apps.push({
          appId,
          appName: appNameMap.get(appId) ?? appId,
          leaseTtlRemaining: (ttl as number) > 0 ? (ttl as number) : 0,
        });
        instanceMap.set(instanceId as string, apps);
      }
    }

    const instances = Array.from(instanceMap.entries()).map(
      ([instanceId, claimedApps]) => ({ instanceId, claimedApps }),
    );

    const unclaimedApps = allApps
      .filter((app) => !claimedAppIds.has(app.id))
      .map((app) => ({ appId: app.id, appName: app.name }));

    return { instances, unclaimedApps };
  }

  async rebalance(): Promise<RebalanceResponseDto> {
    const { instances, unclaimedApps } = await this.getInstances();
    const totalInstances = instances.length;

    if (totalInstances <= 1) {
      const totalApps = instances.reduce(
        (sum, i) => sum + i.claimedApps.length,
        0,
      ) + unclaimedApps.length;
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

      // Sort by TTL ascending so we release claims closest to expiry first
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
