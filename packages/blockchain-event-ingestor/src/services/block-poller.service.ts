import { InterfaceAbi, JsonRpcProvider, Log } from 'ethers';
import { Chain, EventQueueMessage, Subscription, SyncStatus } from '../types';
import { EventParser } from '../utils/event-parser';
import { AdminApiService } from './admin-api.service';
import { createLogger } from './logger.service';
import { QueuePublisherService } from './queue-publisher.service';

const logger = createLogger('BlockPoller');

const BATCH_SIZE = 100n;

export class BlockPollerService {
  private provider: JsonRpcProvider;
  private eventParser: EventParser;
  private lastProcessedBlock: bigint = 0n;
  private isRunning = false;
  private isCatchingUp = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private statusReportInterval: NodeJS.Timeout | null = null;

  constructor(
    private chain: Chain,
    private subscriptions: Subscription[],
    private queuePublisher: QueuePublisherService,
    private adminApi: AdminApiService,
    private pollIntervalMs: number,
    private statusReportIntervalMs: number,
  ) {
    this.provider = new JsonRpcProvider(chain.rpcUrl);
    this.eventParser = new EventParser();
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

      // Try to get last processed block from admin-api
      const syncStatus = await this.adminApi.getSyncStatus(this.chain.id);

      if (syncStatus && syncStatus.latestBlockNumber) {
        // Resume from the last processed block
        this.lastProcessedBlock = BigInt(syncStatus.latestBlockNumber);
        logger.info(
          `Resuming from block ${this.lastProcessedBlock} on chain ${this.chain.name} (latest: ${latestBlockBigInt})`,
        );
      } else {
        // No previous sync status, start from latest block
        this.lastProcessedBlock = latestBlockBigInt;
        logger.info(
          `No previous sync status found. Starting from latest block ${this.lastProcessedBlock} on chain ${this.chain.name}`,
        );
      }
      logger.debug(`lastProcessedBlock: ${this.lastProcessedBlock}, latestBlockBigInt: ${latestBlockBigInt}`);

      // Check if we need to catch up
      const gap = latestBlockBigInt - this.lastProcessedBlock;
      if (gap > BATCH_SIZE) {
        this.isCatchingUp = true;
        logger.info(
          `Catching up ${gap} blocks on chain ${this.chain.name}. Will process in batches of ${BATCH_SIZE}.`,
        );
      }

      // Report initial status
      await this.reportStatus('SYNCING');

      // Start polling (use short interval when catching up)
      this.schedulePoll();

      // Start status reporting
      this.statusReportInterval = setInterval(
        () => this.reportStatus(this.isCatchingUp ? 'SYNCING' : 'SYNCED'),
        this.statusReportIntervalMs,
      );
    } catch (error) {
      logger.error(`Failed to start block poller for chain ${this.chain.name}`, { error });
      await this.reportStatus('ERROR', error instanceof Error ? error.message : 'Unknown error');
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop polling
   */
  async stop(): Promise<void> {
    const wasRunning = this.isRunning;
    this.isRunning = false;

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.statusReportInterval) {
      clearInterval(this.statusReportInterval);
      this.statusReportInterval = null;
    }

    // Destroy the provider to stop internal network detection retries
    this.provider.destroy();

    if (wasRunning) {
      await this.reportStatus('STOPPED');
    }
    logger.info(`Stopped block poller for chain ${this.chain.name}`);
  }

  /**
   * Update subscriptions (called when config refresh signal is received)
   */
  updateSubscriptions(subscriptions: Subscription[]): void {
    this.subscriptions = subscriptions;
    this.eventParser.clearCache();
    logger.info(`Updated ${subscriptions.length} subscriptions for chain ${this.chain.name}`);
  }

  /**
   * Get target block number (finalized block with fallback to latest)
   */
  private async getTargetBlockNumber(logOnFallback = false): Promise<bigint> {
    const finalizedBlock = await this.provider.getBlock('finalized');

    if (!finalizedBlock || finalizedBlock.number === 0) {
      if (logOnFallback) {
        logger.warn(
          `Finalized block not available on chain ${this.chain.name}, falling back to latest block`,
        );
      }
      const latestBlock = await this.provider.getBlockNumber();
      return BigInt(latestBlock);
    }

    return BigInt(finalizedBlock.number);
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

    // Use minimal delay when catching up, otherwise use block time based interval
    const interval = this.isCatchingUp ? 100 : this.chain.blockTime * 1000;

    this.pollInterval = setTimeout(() => {
      this.poll()
        .catch((error) => logger.error('Poll execution failed', { error }))
        .finally(() => this.schedulePoll());
    }, interval);
  }

  /**
   * Poll for new blocks and process events
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || this.subscriptions.length === 0) return;

    try {
      // Get target block number (finalized with fallback to latest)
      const latestBlockBigInt = await this.getTargetBlockNumber();

      if (latestBlockBigInt <= this.lastProcessedBlock) {
        // No new blocks, switch to normal interval if we were catching up
        if (this.isCatchingUp) {
          this.isCatchingUp = false;
          logger.info(`Chain ${this.chain.name} is now synced at block ${this.lastProcessedBlock}`);
          await this.reportStatus('SYNCED');
        }
        return;
      }

      const fromBlock = this.lastProcessedBlock + 1n;
      const gap = latestBlockBigInt - this.lastProcessedBlock;

      // Limit batch size when catching up
      let toBlock: bigint;
      if (gap > BATCH_SIZE) {
        toBlock = fromBlock + BATCH_SIZE - 1n;
        this.isCatchingUp = true;
        logger.info(
          `Batch processing blocks ${fromBlock} to ${toBlock} on chain ${this.chain.name} (${gap} blocks behind)`,
        );
      } else {
        toBlock = latestBlockBigInt;
        if (this.isCatchingUp) {
          this.isCatchingUp = false;
          logger.info(`Chain ${this.chain.name} caught up, switching to normal polling interval`);
        }
      }

      logger.debug(`Processing blocks ${fromBlock} to ${toBlock} on chain ${this.chain.name}`);

      // Get logs using optimized filter
      const logs = await this.getLogs(fromBlock, toBlock);

      if (logs.length > 0) {
        await this.processLogs(logs, Number(toBlock));
      }

      this.lastProcessedBlock = toBlock;

      // Report status based on sync state
      await this.reportStatus(this.isCatchingUp ? 'SYNCING' : 'SYNCED');
    } catch (error) {
      logger.error(`Error polling blocks on chain ${this.chain.name}`, { error });
      await this.reportStatus('ERROR', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get logs using optimized filter parameters
   */
  private async getLogs(fromBlock: bigint, toBlock: bigint): Promise<Log[]> {
    // Group subscriptions by contract address
    const addressSet = new Set<string>();
    const topicSet = new Set<string>();

    for (const sub of this.subscriptions) {
      addressSet.add(sub.contractAddress.toLowerCase());
      topicSet.add(sub.eventSignature);
    }

    const addresses = Array.from(addressSet);
    const topics = [Array.from(topicSet)]; // topics[0] is an array of event signatures

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
   * Process logs and publish to queues
   */
  private async processLogs(logs: Log[], blockNumber: number): Promise<void> {
    const eventsToPublish: Array<{ applicationId: string; message: EventQueueMessage }> = [];

    // Get block timestamp
    const block = await this.provider.getBlock(blockNumber);
    const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

    for (const log of logs) {
      // Find matching subscriptions
      const matchingSubscriptions = this.subscriptions.filter(
        (sub) =>
          sub.contractAddress.toLowerCase() === log.address.toLowerCase() &&
          sub.eventSignature === log.topics[0],
      );
      
      // logger about log.address and log.topics[0]
      logger.debug(`Processing log from address ${log.address} with topic ${log.topics[0]}`);
      
      for (const sub of matchingSubscriptions) {
        // Parse the event data using the ABI
        const parsedEvent = this.eventParser.parseLog(
          log,
          sub.abi as InterfaceAbi,
          `${sub.contractAddress}-${sub.eventSignature}`,
        );

        if (!parsedEvent) continue;

        // Check filter conditions if any
        if (sub.filterConditions && !this.matchesFilter(parsedEvent.args, sub.filterConditions)) {
          continue;
        }

        const message: EventQueueMessage = {
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
        };

        eventsToPublish.push({
          applicationId: sub.applicationId,
          message,
        });
      }
    }

    if (eventsToPublish.length > 0) {
      await this.queuePublisher.publishEvents(eventsToPublish);
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

  /**
   * Report sync status to admin-api
   */
  private async reportStatus(status: SyncStatus, error?: string): Promise<void> {
    try {
      await this.adminApi.updateSyncStatus(this.chain.id, {
        latestBlockNumber: this.lastProcessedBlock.toString(),
        syncStatus: status,
        lastError: error,
      });
    } catch (err) {
      logger.error(`Failed to report status for chain ${this.chain.name}`, { error: err });
    }
  }
}
