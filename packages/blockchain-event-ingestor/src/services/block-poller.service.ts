import { InterfaceAbi, JsonRpcProvider, Log } from 'ethers';
import { Chain, EventQueueMessage, Subscription } from '../types';
import { EventParser } from '../utils/event-parser';
import { SubscriptionIndex } from '../utils/subscription-index';
import { AdminApiService } from './admin-api.service';
import { AppProgressService } from './app-progress.service';
import { createLogger } from './logger.service';
import { QueuePublisherService } from './queue-publisher.service';

const logger = createLogger('BlockPoller');

/**
 * Max block range per eth_getLogs call.
 * Most RPC providers support 2000+ block ranges.
 * Tune down if your RPC provider returns "query returned more than X results" errors.
 */
const BATCH_SIZE = 500n;

export class BlockPollerService {
  private provider: JsonRpcProvider;
  private eventParser: EventParser;
  private subscriptionIndex: SubscriptionIndex;
  private lastProcessedBlock: bigint = 0n;
  private lastWrittenProgress = new Map<string, string>();
  private isRunning = false;
  private isCatchingUp = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastPollStartTime: number = 0;

  constructor(
    private chain: Chain,
    private subscriptions: Subscription[],
    private queuePublisher: QueuePublisherService,
    private adminApi: AdminApiService,
    private pollIntervalMs: number,
    private appProgressService?: AppProgressService,
  ) {
    this.provider = new JsonRpcProvider(chain.rpcUrl);
    this.eventParser = new EventParser();
    this.subscriptionIndex = new SubscriptionIndex();
    this.subscriptionIndex.build(subscriptions);
  }

  /**
   * Get the last processed block number
   */
  getLastProcessedBlock(): bigint {
    return this.lastProcessedBlock;
  }

  /**
   * Start polling for new blocks
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn(`Block poller for chain ${this.chain.name} is already running`);
      return;
    }

    this.isRunning = true;
    logger.info(`Starting block poller for chain ${this.chain.name} (${this.chain.chainId})`);

    try {
      // Get current chain's target block number (finalized with fallback to latest)
      const latestBlockBigInt = await this.getTargetBlockNumber(true);

      logger.info(`Current target block number on chain ${this.chain.name} is ${latestBlockBigInt}`);

      // Determine start block
      let startBlock: bigint | null = null;

      if (this.appProgressService) {
        // When partitioning is enabled, use the minimum progress across claimed apps
        startBlock = await this.getMinAppProgress();
      }

      if (startBlock === null) {
        startBlock = latestBlockBigInt;
        logger.info(
          `No previous progress found. Starting from latest block ${startBlock} on chain ${this.chain.name}`,
        );
      } else {
        logger.info(
          `Resuming from min app progress block ${startBlock} on chain ${this.chain.name} (latest: ${latestBlockBigInt})`,
        );
      }

      this.lastProcessedBlock = startBlock;
      logger.debug(`lastProcessedBlock: ${this.lastProcessedBlock}, latestBlockBigInt: ${latestBlockBigInt}`);

      // Check if we need to catch up
      const gap = latestBlockBigInt - this.lastProcessedBlock;
      if (gap > BATCH_SIZE) {
        this.isCatchingUp = true;
        logger.info(
          `Catching up ${gap} blocks on chain ${this.chain.name}. Will process in batches of ${BATCH_SIZE}.`,
        );
      }

      // Start polling (use short interval when catching up)
      this.schedulePoll();
    } catch (error) {
      logger.error(`Failed to start block poller for chain ${this.chain.name}`, { error });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop polling
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    // Destroy the provider to stop internal network detection retries
    this.provider.destroy();

    logger.info(`Stopped block poller for chain ${this.chain.name}`);
  }

  /**
   * Update subscriptions (called when config refresh signal is received)
   */
  updateSubscriptions(subscriptions: Subscription[]): void {
    this.subscriptions = subscriptions;
    this.subscriptionIndex.build(subscriptions);
    this.eventParser.clearCache();
    logger.info(`Updated ${subscriptions.length} subscriptions for chain ${this.chain.name}`);
  }

  /**
   * Add subscriptions for a newly claimed app
   */
  addSubscriptions(newSubs: Subscription[]): void {
    this.subscriptions = [...this.subscriptions, ...newSubs];
    this.subscriptionIndex.build(this.subscriptions);
    this.eventParser.clearCache();
    logger.info(
      `Added ${newSubs.length} subscriptions for chain ${this.chain.name}, total: ${this.subscriptions.length}`,
    );
  }

  /**
   * Remove subscriptions for a released app
   */
  removeSubscriptions(appId: string): void {
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter((s) => s.applicationId !== appId);
    this.subscriptionIndex.build(this.subscriptions);
    this.eventParser.clearCache();
    logger.info(
      `Removed ${before - this.subscriptions.length} subscriptions for app ${appId} on chain ${this.chain.name}, remaining: ${this.subscriptions.length}`,
    );
  }

  /**
   * Get the number of current subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  /**
   * Catch up a specific application from a given block to the poller's current position.
   * Used when a newly claimed app is behind the chain poller.
   */
  async catchUpApplication(
    appId: string,
    appSubscriptions: Subscription[],
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<void> {
    logger.info(
      `Catching up app ${appId} on chain ${this.chain.name} from block ${fromBlock} to ${toBlock}`,
    );

    // Build a local index for the app's subscriptions
    const localIndex = new SubscriptionIndex();
    localIndex.build(appSubscriptions);

    let current = fromBlock;
    while (current <= toBlock) {
      const batchEnd = current + BATCH_SIZE - 1n > toBlock ? toBlock : current + BATCH_SIZE - 1n;

      // Get logs for this app's addresses/topics only
      const logs = await this.getLogsForSubscriptions(current, batchEnd, appSubscriptions);

      const eventsToPublish: Array<{ applicationId: string; message: EventQueueMessage }> = [];

      if (logs.length > 0) {
        const block = await this.provider.getBlock(Number(batchEnd));
        const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

        for (const log of logs) {
          const matchingSubs = localIndex.lookup(log.address, log.topics[0]);

          for (const sub of matchingSubs) {
            const parsedEvent = this.eventParser.parseLog(
              log,
              sub.abi as InterfaceAbi,
              `${sub.contractAddress}-${sub.eventSignature}`,
            );
            if (!parsedEvent) continue;
            if (sub.filterConditions && !this.matchesFilter(parsedEvent.args, sub.filterConditions)) {
              continue;
            }

            eventsToPublish.push({
              applicationId: sub.applicationId,
              message: {
                subscriptionId: sub.id,
                eventTopic: log.topics[0],
                data: parsedEvent.args,
                metadata: {
                  blockNumber: log.blockNumber,
                  transactionHash: log.transactionHash,
                  logIndex: log.index,
                  chainId: this.chain.chainId,
                  contractAddress: log.address,
                  timestamp,
                },
              },
            });
          }
        }
      }

      // Publish events + update progress atomically
      if (this.appProgressService) {
        const progressKey = this.appProgressService.getProgressKey(appId, this.chain.id);
        await this.queuePublisher.publishEventsWithProgress(eventsToPublish, [
          { key: progressKey, value: batchEnd.toString() },
        ]);
      } else if (eventsToPublish.length > 0) {
        await this.queuePublisher.publishEvents(eventsToPublish);
      }

      logger.debug(
        `Catch-up app ${appId}: processed blocks ${current}-${batchEnd}, ${eventsToPublish.length} events`,
      );
      current = batchEnd + 1n;
    }

    logger.info(`Catch-up complete for app ${appId} on chain ${this.chain.name}`);
  }

  /**
   * Get target block number (finalized block with fallback to latest).
   * Uses lightweight RPC call that excludes transaction data.
   */
  private async getTargetBlockNumber(logOnFallback = false): Promise<bigint> {
    try {
      const result = await this.provider.send('eth_getBlockByNumber', ['finalized', false]);
      if (result && result.number) {
        return BigInt(result.number);
      }
    } catch {
      // finalized tag not supported, fall through to latest
    }

    if (logOnFallback) {
      logger.warn(
        `Finalized block not available on chain ${this.chain.name}, falling back to latest block`,
      );
    }
    const latestBlock = await this.provider.getBlockNumber();
    return BigInt(latestBlock);
  }

  /**
   * Get the minimum progress across all claimed apps on this chain.
   * Uses batch Redis pipeline when available.
   */
  private async getMinAppProgress(): Promise<bigint | null> {
    if (!this.appProgressService) return null;

    const appIds = [...new Set(this.subscriptions.map((s) => s.applicationId))];
    if (appIds.length === 0) return null;

    const results = await this.appProgressService.getProgressBatch(appIds, this.chain.id);
    let minProgress: bigint | null = null;

    for (const progress of results.values()) {
      if (progress !== null) {
        if (minProgress === null || progress < minProgress) {
          minProgress = progress;
        }
      }
    }

    return minProgress;
  }

  /**
   * Schedule the next poll with appropriate interval
   */
  private schedulePoll(): void {
    if (!this.isRunning) return;

    // Clear existing interval if any
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    // Compensate for processing time: subtract elapsed time from block interval
    const blockIntervalMs = this.chain.blockTime * 1000;
    const elapsed = this.lastPollStartTime > 0 ? Date.now() - this.lastPollStartTime : 0;
    const interval = Math.max(0, blockIntervalMs - elapsed);

    this.pollInterval = setTimeout(() => {
      this.poll()
        .catch((error) => logger.error('Poll execution failed', { error }))
        .finally(() => this.schedulePoll());
    }, interval);
  }

  /**
   * Poll for new blocks and process events.
   * Uses a drain loop to process all pending blocks before returning.
   *
   * The target block is captured once at entry and never re-fetched within
   * the loop. This guarantees the loop terminates when the initial target
   * is reached, even on chains with very short block times. Any blocks
   * produced during this poll cycle will be picked up by the next
   * scheduled poll invocation.
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || this.subscriptions.length === 0) return;

    this.lastPollStartTime = Date.now();
    let loggedCatchingUp = false;

    try {
      // Fetch target block once before the drain loop (immutable ceiling for this cycle)
      const latestBlockBigInt = await this.getTargetBlockNumber(true);

      logger.debug(`Starting poll cycle on chain ${this.chain.name}. lastProcessedBlock: ${this.lastProcessedBlock}, targetBlock: ${latestBlockBigInt}`);

      // Drain loop: process all pending blocks before returning
      while (this.isRunning) {
        if (latestBlockBigInt <= this.lastProcessedBlock) {
          // No new blocks, we're synced
          if (this.isCatchingUp) {
            this.isCatchingUp = false;
            logger.info(`Chain ${this.chain.name} is now synced at block ${this.lastProcessedBlock}`);
          }
          break;
        }

        const fromBlock = this.lastProcessedBlock + 1n;
        const gap = latestBlockBigInt - this.lastProcessedBlock;

        // Batch sizing: process up to BATCH_SIZE blocks per getLogs call.
        // When gap <= BATCH_SIZE, process ALL pending blocks in one call.
        let toBlock: bigint;
        if (gap > BATCH_SIZE) {
          toBlock = fromBlock + BATCH_SIZE - 1n;
          if (!this.isCatchingUp) {
            this.isCatchingUp = true;
          }
          if (!loggedCatchingUp) {
            logger.info(
              `Catching up on chain ${this.chain.name}: ${gap} blocks behind, processing in batches of ${BATCH_SIZE}`,
            );
            loggedCatchingUp = true;
          }
        } else {
          toBlock = latestBlockBigInt;
          if (this.isCatchingUp) {
            this.isCatchingUp = false;
            logger.info(`Chain ${this.chain.name} caught up, switching to normal polling interval`);
          }
        }

        logger.debug(`Processing blocks ${fromBlock} to ${toBlock} on chain ${this.chain.name}`);

        // Get logs using optimized filter (wide range when catching up)
        const logs = await this.getLogs(fromBlock, toBlock);

        await this.processLogs(logs, Number(toBlock), toBlock);

        this.lastProcessedBlock = toBlock;
      }
    } catch (error) {
      logger.error(`Error polling blocks on chain ${this.chain.name}`, { error });
    }
  }

  /**
   * Get logs using optimized filter parameters
   */
  private async getLogs(fromBlock: bigint, toBlock: bigint): Promise<Log[]> {
    return this.getLogsForSubscriptions(fromBlock, toBlock, this.subscriptions);
  }

  /**
   * Get logs for a specific set of subscriptions
   */
  private async getLogsForSubscriptions(
    fromBlock: bigint,
    toBlock: bigint,
    subscriptions: Subscription[],
  ): Promise<Log[]> {
    if (subscriptions.length === 0) return [];

    const addressSet = new Set<string>();
    const topicSet = new Set<string>();

    for (const sub of subscriptions) {
      addressSet.add(sub.contractAddress.toLowerCase());
      topicSet.add(sub.eventSignature);
    }

    const addresses = Array.from(addressSet);
    const topics = [Array.from(topicSet)];

    try {
      const logs = await this.provider.getLogs({
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock),
        address: addresses.length === 1 ? addresses[0] : addresses,
        topics,
      });

      return logs;
    } catch (error) {
      logger.error(`Failed to get logs for chain ${this.chain.name}`, { error });
      throw error;
    }
  }

  /**
   * Unified log processing: matches logs → subscriptions, publishes events,
   * and optionally writes per-app progress (when appProgressService is present).
   */
  private async processLogs(
    logs: Log[],
    blockNumber: number,
    toBlock?: bigint,
  ): Promise<void> {
    const eventsToPublish: Array<{ applicationId: string; message: EventQueueMessage }> = [];

    if (logs.length > 0) {
      const block = await this.provider.getBlock(blockNumber);
      const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

      for (const log of logs) {
        const matchingSubscriptions = this.subscriptionIndex.lookup(log.address, log.topics[0]);

        logger.debug(`Processing log from address ${log.address} with topic ${log.topics[0]}`);

        for (const sub of matchingSubscriptions) {
          const parsedEvent = this.eventParser.parseLog(
            log,
            sub.abi as InterfaceAbi,
            `${sub.contractAddress}-${sub.eventSignature}`,
          );
          if (!parsedEvent) continue;
          if (sub.filterConditions && !this.matchesFilter(parsedEvent.args, sub.filterConditions)) {
            continue;
          }

          eventsToPublish.push({
            applicationId: sub.applicationId,
            message: {
              subscriptionId: sub.id,
              eventTopic: log.topics[0],
              data: parsedEvent.args,
              metadata: {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.index,
                chainId: this.chain.chainId,
                contractAddress: log.address,
                timestamp,
              },
            },
          });
        }
      }
    }

    if (this.appProgressService && toBlock !== undefined) {
      // Build progress updates only for apps whose value actually changed
      const activeAppIds = new Set(this.subscriptions.map((s) => s.applicationId));
      const progressUpdates: Array<{ key: string; value: string }> = [];
      const newValue = toBlock.toString();

      for (const appId of activeAppIds) {
        const key = this.appProgressService.getProgressKey(appId, this.chain.id);
        if (this.lastWrittenProgress.get(key) !== newValue) {
          progressUpdates.push({ key, value: newValue });
          this.lastWrittenProgress.set(key, newValue);
        }
      }

      if (progressUpdates.length > 0 || eventsToPublish.length > 0) {
        await this.queuePublisher.publishEventsWithProgress(eventsToPublish, progressUpdates);
      }
    } else if (eventsToPublish.length > 0) {
      await this.queuePublisher.publishEvents(eventsToPublish);
    }

    if (eventsToPublish.length > 0) {
      logger.info(
        `Published ${eventsToPublish.length} events from block ${blockNumber} on chain ${this.chain.name}`,
      );
    }
  }

  /**
   * Check if event args match the filter conditions
   */
  private matchesFilter(args: Record<string, unknown>, filterConditions: unknown): boolean {
    if (!filterConditions || !Array.isArray(filterConditions)) {
      return true;
    }

    for (const condition of filterConditions) {
      const { field, operator, value } = condition as {
        field: string;
        operator: string;
        value: unknown;
      };

      const fieldValue = args[field];
      if (fieldValue === undefined) continue;

      switch (operator) {
        case 'eq':
          if (String(fieldValue) !== String(value)) return false;
          break;
        case 'ne':
          if (String(fieldValue) === String(value)) return false;
          break;
        case 'gt':
          if (Number(fieldValue) <= Number(value)) return false;
          break;
        case 'gte':
          if (Number(fieldValue) < Number(value)) return false;
          break;
        case 'lt':
          if (Number(fieldValue) >= Number(value)) return false;
          break;
        case 'lte':
          if (Number(fieldValue) > Number(value)) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(String(value))) return false;
          break;
      }
    }

    return true;
  }

}
