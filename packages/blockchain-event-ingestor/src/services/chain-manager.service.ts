import { Config } from '../config';
import { Chain, Subscription, ConfigRefreshType } from '../types';
import { AdminApiService } from './admin-api.service';
import { AppClaimService } from './app-claim.service';
import { AppProgressService } from './app-progress.service';
import { QueuePublisherService } from './queue-publisher.service';
import { BlockPollerService } from './block-poller.service';
import { createLogger } from './logger.service';

const logger = createLogger('ChainManager');

export class ChainManagerService {
  private chains: Map<number, Chain> = new Map();
  private subscriptions: Map<number, Subscription[]> = new Map(); // chainId -> subscriptions
  private pollers: Map<number, BlockPollerService> = new Map();
  private adminApi: AdminApiService;
  private queuePublisher: QueuePublisherService;

  // Partitioning state
  private allSubscriptions: Subscription[] = [];
  private claimedAppIds: Set<string> = new Set();

  constructor(
    private config: Config,
    private appClaimService?: AppClaimService,
    private appProgressService?: AppProgressService,
  ) {
    this.adminApi = new AdminApiService(config);
    this.queuePublisher = new QueuePublisherService(config);
  }

  private static readonly RETRY_INTERVAL_MS = 5000; // 5 seconds
  private static readonly MAX_RETRY_LOG_INTERVAL = 6; // Log every 6th retry (30 seconds)

  /**
   * Initialize the chain manager - fetch initial data and start pollers
   * Retries indefinitely until admin-api is available
   */
  async initialize(): Promise<void> {
    logger.info('Initializing chain manager...');

    const data = await this.fetchInitialDataWithRetry();

    // Store chains
    for (const chain of data.chains) {
      this.chains.set(chain.id, chain);
    }

    if (this.isPartitioningEnabled()) {
      // Partitioning mode: store all subscriptions, set up claim service
      this.allSubscriptions = data.subscriptions;

      // Extract unique app IDs and provide to claim service
      const appIds = [...new Set(data.subscriptions.map((s) => s.applicationId))];
      this.appClaimService!.setKnownApps(appIds);

      // Register claim/release handlers
      this.appClaimService!.onAppClaimed(async (appId) => {
        await this.handleAppClaimed(appId);
      });
      this.appClaimService!.onAppReleased(async (appId) => {
        await this.handleAppReleased(appId);
      });

      // Start claim loop (will trigger onAppClaimed for each claimed app)
      await this.appClaimService!.start();

      logger.info(
        `Chain manager initialized in partitioning mode with ${this.chains.size} chains, ${data.subscriptions.length} subscriptions, ${appIds.length} apps`,
      );
    } else {
      // Legacy mode: use all subscriptions directly
      for (const sub of data.subscriptions) {
        const chainSubs = this.subscriptions.get(sub.chainId) || [];
        chainSubs.push(sub);
        this.subscriptions.set(sub.chainId, chainSubs);
      }

      // Start pollers for active chains
      for (const chain of data.chains) {
        if (chain.enabled) {
          await this.startPoller(chain);
        }
      }

      logger.info(
        `Chain manager initialized with ${this.chains.size} chains and ${data.subscriptions.length} subscriptions`,
      );
    }
  }

  /**
   * Check if partitioning is enabled
   */
  private isPartitioningEnabled(): boolean {
    return !!(this.appClaimService && this.appProgressService && this.config.partitioning.enabled);
  }

  /**
   * Handle a newly claimed application
   */
  private async handleAppClaimed(appId: string): Promise<void> {
    logger.info(`Handling app claimed: ${appId}`);
    this.claimedAppIds.add(appId);

    // Filter subscriptions for this app
    const appSubs = this.allSubscriptions.filter((s) => s.applicationId === appId);
    if (appSubs.length === 0) {
      logger.info(`App ${appId} has no subscriptions`);
      return;
    }

    // Group by chainId
    const subsByChain = new Map<number, Subscription[]>();
    for (const sub of appSubs) {
      const chainSubs = subsByChain.get(sub.chainId) || [];
      chainSubs.push(sub);
      subsByChain.set(sub.chainId, chainSubs);
    }

    for (const [chainId, chainAppSubs] of subsByChain) {
      const chain = this.chains.get(chainId);
      if (!chain || !chain.enabled) continue;

      // Read app's progress for this chain
      const progress = await this.appProgressService!.getProgress(appId, chainId);
      const existingPoller = this.pollers.get(chainId);

      if (existingPoller) {
        const pollerPosition = existingPoller.getLastProcessedBlock();

        if (progress === null) {
          // New app (no progress): set progress to poller's current position
          await this.appProgressService!.setProgress(appId, chainId, pollerPosition);
          existingPoller.addSubscriptions(chainAppSubs);
          logger.info(
            `App ${appId} is new on chain ${chain.name}, set progress to ${pollerPosition}`,
          );
        } else if (progress < pollerPosition) {
          // App is behind: catch up first, then add to poller
          logger.info(
            `App ${appId} is behind on chain ${chain.name} (progress: ${progress}, poller: ${pollerPosition}), catching up`,
          );
          await existingPoller.catchUpApplication(appId, chainAppSubs, progress + 1n, pollerPosition);
          existingPoller.addSubscriptions(chainAppSubs);
        } else {
          // App is caught up: just add subscriptions
          existingPoller.addSubscriptions(chainAppSubs);
          logger.info(`App ${appId} is caught up on chain ${chain.name}`);
        }
      } else {
        // No poller for this chain yet - need to start one
        if (progress === null) {
          // New app: progress will be set when poller starts (from chain head)
        }

        // Add these subs to the chain's subscription list
        const existingSubs = this.subscriptions.get(chainId) || [];
        this.subscriptions.set(chainId, [...existingSubs, ...chainAppSubs]);

        await this.startPoller(chain);
      }
    }
  }

  /**
   * Handle a released application
   */
  private async handleAppReleased(appId: string): Promise<void> {
    logger.info(`Handling app released: ${appId}`);
    this.claimedAppIds.delete(appId);

    // Find affected pollers and remove this app's subscriptions
    for (const [chainId, poller] of this.pollers) {
      poller.removeSubscriptions(appId);

      // Also update the stored subscription list
      const chainSubs = this.subscriptions.get(chainId);
      if (chainSubs) {
        this.subscriptions.set(
          chainId,
          chainSubs.filter((s) => s.applicationId !== appId),
        );
      }

      // Stop poller if no subscriptions remaining
      if (poller.getSubscriptionCount() === 0) {
        logger.info(`No subscriptions remaining on chain ${chainId}, stopping poller`);
        await this.stopPoller(chainId);
      }
    }
  }

  /**
   * Fetch initial data from admin-api with retry logic
   * Retries indefinitely until successful
   */
  private async fetchInitialDataWithRetry(): Promise<{
    chains: Chain[];
    subscriptions: Subscription[];
  }> {
    let retryCount = 0;

    while (true) {
      try {
        const data = await this.adminApi.getSubscriptions();
        if (retryCount > 0) {
          logger.info('Successfully connected to admin-api after retries', {
            totalRetries: retryCount,
          });
        }
        return data;
      } catch (error) {
        retryCount++;

        // Log every N retries to avoid log spam
        if (retryCount === 1 || retryCount % ChainManagerService.MAX_RETRY_LOG_INTERVAL === 0) {
          logger.warn(
            `Failed to fetch data from admin-api, retrying... (attempt ${retryCount})`,
            {
              nextRetryInMs: ChainManagerService.RETRY_INTERVAL_MS,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          );
        }

        await this.sleep(ChainManagerService.RETRY_INTERVAL_MS);
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle config refresh signal from Redis
   */
  async handleRefresh(type: ConfigRefreshType): Promise<void> {
    logger.info(`Handling config refresh: ${type}`);

    switch (type) {
      case 'CHAIN_CREATED':
      case 'CHAIN_UPDATED':
      case 'CHAIN_DELETED':
        await this.refreshChains();
        break;
      case 'SUBSCRIPTION_CREATED':
      case 'SUBSCRIPTION_UPDATED':
      case 'SUBSCRIPTION_DELETED':
      case 'PROGRAM_CREATED':
      case 'PROGRAM_UPDATED':
      case 'PROGRAM_DELETED':
        await this.refreshSubscriptions();
        break;
      case 'FULL_REFRESH':
        await this.fullRefresh();
        break;
    }
  }

  /**
   * Refresh chain configuration from admin-api
   */
  private async refreshChains(): Promise<void> {
    try {
      const data = await this.adminApi.getSubscriptions();

      // Update allSubscriptions if partitioning enabled
      if (this.isPartitioningEnabled()) {
        this.allSubscriptions = data.subscriptions;
        const appIds = [...new Set(data.subscriptions.map((s) => s.applicationId))];
        this.appClaimService!.setKnownApps(appIds);
      }

      // Find chains to add, update, or remove
      const newChainIds = new Set(data.chains.map((c) => c.id));
      const currentChainIds = new Set(this.chains.keys());

      // Remove deleted chains
      for (const chainId of currentChainIds) {
        if (!newChainIds.has(chainId)) {
          await this.stopPoller(chainId);
          this.chains.delete(chainId);
          this.subscriptions.delete(chainId);
          logger.info(`Removed chain ${chainId}`);
        }
      }

      // Add or update chains
      for (const chain of data.chains) {
        const existingChain = this.chains.get(chain.id);

        if (!existingChain) {
          // New chain
          this.chains.set(chain.id, chain);
          if (chain.enabled) {
            const chainSubs = this.getFilteredSubscriptions(data.subscriptions, chain.id);
            this.subscriptions.set(chain.id, chainSubs);
            await this.startPoller(chain);
          }
        } else if (this.chainNeedsRestart(existingChain, chain)) {
          // Chain config changed - restart poller
          await this.stopPoller(chain.id);
          this.chains.set(chain.id, chain);

          if (chain.enabled) {
            const chainSubs = this.getFilteredSubscriptions(data.subscriptions, chain.id);
            this.subscriptions.set(chain.id, chainSubs);
            await this.startPoller(chain);
          }
        } else {
          // Just update chain data
          this.chains.set(chain.id, chain);
        }
      }
    } catch (error) {
      logger.error('Failed to refresh chains', { error });
    }
  }

  /**
   * Refresh subscriptions from admin-api
   */
  private async refreshSubscriptions(): Promise<void> {
    try {
      const data = await this.adminApi.getSubscriptions();

      // Update allSubscriptions if partitioning enabled
      if (this.isPartitioningEnabled()) {
        this.allSubscriptions = data.subscriptions;
        const appIds = [...new Set(data.subscriptions.map((s) => s.applicationId))];
        this.appClaimService!.setKnownApps(appIds);
      }

      // Filter subscriptions by claimed apps if partitioning enabled
      const activeSubs = this.isPartitioningEnabled()
        ? data.subscriptions.filter((s) => this.claimedAppIds.has(s.applicationId))
        : data.subscriptions;

      // Group subscriptions by chainId
      const newSubscriptions = new Map<number, Subscription[]>();
      for (const sub of activeSubs) {
        const chainSubs = newSubscriptions.get(sub.chainId) || [];
        chainSubs.push(sub);
        newSubscriptions.set(sub.chainId, chainSubs);
      }

      // Update subscriptions for each chain
      for (const [chainId, subs] of newSubscriptions) {
        this.subscriptions.set(chainId, subs);
        const poller = this.pollers.get(chainId);
        if (poller) {
          poller.updateSubscriptions(subs);
        }
      }

      // Clear subscriptions for chains that have none
      for (const chainId of this.chains.keys()) {
        if (!newSubscriptions.has(chainId)) {
          this.subscriptions.set(chainId, []);
          const poller = this.pollers.get(chainId);
          if (poller) {
            poller.updateSubscriptions([]);
          }
        }
      }

      logger.info(`Refreshed subscriptions: ${activeSubs.length} active`);
    } catch (error) {
      logger.error('Failed to refresh subscriptions', { error });
    }
  }

  /**
   * Full refresh - reload everything from admin-api
   */
  private async fullRefresh(): Promise<void> {
    logger.info('Performing full refresh...');

    try {
      // Stop all pollers
      for (const chainId of this.pollers.keys()) {
        await this.stopPoller(chainId);
      }

      // Clear all data
      this.chains.clear();
      this.subscriptions.clear();

      // Re-initialize
      await this.initialize();
    } catch (error) {
      logger.error('Failed to perform full refresh', { error });
    }
  }

  /**
   * Get subscriptions filtered by claimed apps (if partitioning enabled)
   */
  private getFilteredSubscriptions(allSubs: Subscription[], chainId: number): Subscription[] {
    const chainSubs = allSubs.filter((s) => s.chainId === chainId);
    if (this.isPartitioningEnabled()) {
      return chainSubs.filter((s) => this.claimedAppIds.has(s.applicationId));
    }
    return chainSubs;
  }

  /**
   * Start a block poller for a chain
   */
  private async startPoller(chain: Chain): Promise<void> {
    if (this.pollers.has(chain.id)) {
      logger.warn(`Poller for chain ${chain.name} already exists`);
      return;
    }

    const chainSubs = this.subscriptions.get(chain.id) || [];
    const poller = new BlockPollerService(
      chain,
      chainSubs,
      this.queuePublisher,
      this.adminApi,
      this.config.polling.intervalMs,
      this.config.polling.statusReportIntervalMs,
      this.isPartitioningEnabled() ? this.appProgressService : undefined,
    );

    this.pollers.set(chain.id, poller);

    try {
      await poller.start();
      logger.info(`Started poller for chain ${chain.name}`);
    } catch (error) {
      logger.error(`Failed to start poller for chain ${chain.name}`, { error });
      await poller.stop();
      this.pollers.delete(chain.id);
    }
  }

  /**
   * Stop a block poller for a chain
   */
  private async stopPoller(chainId: number): Promise<void> {
    const poller = this.pollers.get(chainId);
    if (poller) {
      await poller.stop();
      this.pollers.delete(chainId);
    }
  }

  /**
   * Check if chain config change requires a restart
   */
  private chainNeedsRestart(oldChain: Chain, newChain: Chain): boolean {
    return (
      oldChain.rpcUrl !== newChain.rpcUrl ||
      oldChain.enabled !== newChain.enabled ||
      oldChain.blockTime !== newChain.blockTime
    );
  }

  /**
   * Shutdown all pollers and cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down chain manager...');

    // Stop claim service first (releases all claims immediately)
    if (this.appClaimService) {
      await this.appClaimService.stop();
    }

    for (const chainId of this.pollers.keys()) {
      await this.stopPoller(chainId);
    }

    await this.queuePublisher.close();

    // Close app progress Redis connection
    if (this.appProgressService) {
      await this.appProgressService.close();
    }

    logger.info('Chain manager shut down complete');
  }
}
