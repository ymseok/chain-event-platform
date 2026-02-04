import { Config } from '../config';
import { Chain, Subscription, ConfigRefreshType } from '../types';
import { AdminApiService } from './admin-api.service';
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

  constructor(private config: Config) {
    this.adminApi = new AdminApiService(config);
    this.queuePublisher = new QueuePublisherService(config);
  }

  /**
   * Initialize the chain manager - fetch initial data and start pollers
   */
  async initialize(): Promise<void> {
    logger.info('Initializing chain manager...');

    try {
      // Fetch initial data from admin-api
      const data = await this.adminApi.getSubscriptions();

      // Store chains
      for (const chain of data.chains) {
        this.chains.set(chain.id, chain);
      }

      // Group subscriptions by chainId
      for (const sub of data.subscriptions) {
        const chainSubs = this.subscriptions.get(sub.chainId) || [];
        chainSubs.push(sub);
        this.subscriptions.set(sub.chainId, chainSubs);
      }

      // Start pollers for active chains
      for (const chain of data.chains) {
        if (chain.status === 'ACTIVE') {
          await this.startPoller(chain);
        }
      }

      logger.info(
        `Chain manager initialized with ${this.chains.size} chains and ${data.subscriptions.length} subscriptions`,
      );
    } catch (error) {
      logger.error('Failed to initialize chain manager', { error });
      throw error;
    }
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
          if (chain.status === 'ACTIVE') {
            const chainSubs = data.subscriptions.filter((s) => s.chainId === chain.id);
            this.subscriptions.set(chain.id, chainSubs);
            await this.startPoller(chain);
          }
        } else if (this.chainNeedsRestart(existingChain, chain)) {
          // Chain config changed - restart poller
          await this.stopPoller(chain.id);
          this.chains.set(chain.id, chain);

          if (chain.status === 'ACTIVE') {
            const chainSubs = data.subscriptions.filter((s) => s.chainId === chain.id);
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

      // Group subscriptions by chainId
      const newSubscriptions = new Map<number, Subscription[]>();
      for (const sub of data.subscriptions) {
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

      logger.info(`Refreshed subscriptions: ${data.subscriptions.length} total`);
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
    );

    this.pollers.set(chain.id, poller);

    try {
      await poller.start();
      logger.info(`Started poller for chain ${chain.name}`);
    } catch (error) {
      logger.error(`Failed to start poller for chain ${chain.name}`, { error });
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
      oldChain.status !== newChain.status ||
      oldChain.blockTime !== newChain.blockTime
    );
  }

  /**
   * Shutdown all pollers and cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down chain manager...');

    for (const chainId of this.pollers.keys()) {
      await this.stopPoller(chainId);
    }

    await this.queuePublisher.close();
    logger.info('Chain manager shut down complete');
  }
}
