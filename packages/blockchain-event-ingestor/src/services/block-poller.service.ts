import { InterfaceAbi, JsonRpcProvider, Log } from 'ethers';
import { Chain, EventQueueMessage, Subscription, SyncStatus } from '../types';
import { EventParser } from '../utils/event-parser';
import { AdminApiService } from './admin-api.service';
import { createLogger } from './logger.service';
import { QueuePublisherService } from './queue-publisher.service';

const logger = createLogger('BlockPoller');

export class BlockPollerService {
  private provider: JsonRpcProvider;
  private eventParser: EventParser;
  private lastProcessedBlock: bigint = 0n;
  private isRunning = false;
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
      // Get the latest block number to start from
      const latestBlock = await this.provider.getBlockNumber();
      this.lastProcessedBlock = BigInt(latestBlock);
      logger.info(`Starting from block ${this.lastProcessedBlock} on chain ${this.chain.name}`);

      // Report initial status
      await this.reportStatus('SYNCING');

      // Start polling
      this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);

      // Start status reporting
      this.statusReportInterval = setInterval(
        () => this.reportStatus('SYNCING'),
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
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.statusReportInterval) {
      clearInterval(this.statusReportInterval);
      this.statusReportInterval = null;
    }

    await this.reportStatus('STOPPED');
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
   * Poll for new blocks and process events
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || this.subscriptions.length === 0) return;

    try {
      const latestBlock = await this.provider.getBlockNumber();
      const latestBlockBigInt = BigInt(latestBlock);

      if (latestBlockBigInt <= this.lastProcessedBlock) {
        return; // No new blocks
      }

      const fromBlock = this.lastProcessedBlock + 1n;
      const toBlock = latestBlockBigInt;

      logger.debug(`Processing blocks ${fromBlock} to ${toBlock} on chain ${this.chain.name}`);

      // Get logs using optimized filter
      const logs = await this.getLogs(fromBlock, toBlock);

      if (logs.length > 0) {
        await this.processLogs(logs, Number(toBlock));
      }

      this.lastProcessedBlock = toBlock;
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
