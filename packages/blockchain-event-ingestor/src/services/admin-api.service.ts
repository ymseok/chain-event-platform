import axios, { AxiosInstance } from 'axios';
import { Config } from '../config';
import {
  ChainSyncStatusResponse,
  IngestorSubscriptionsResponse,
  Subscription,
  UpdateSyncStatusRequest,
} from '../types';
import { createLogger } from './logger.service';

const logger = createLogger('AdminApiService');

export class AdminApiService {
  private client: AxiosInstance;

  constructor(private config: Config) {
    this.client = axios.create({
      baseURL: config.adminApi.url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Fetch all active chains and subscriptions
   */
  async getSubscriptions(): Promise<IngestorSubscriptionsResponse> {
    try {
      const response = await this.client.get<IngestorSubscriptionsResponse>(
        '/ingestor/subscriptions',
      );
      logger.info(
        `Fetched ${response.data.chains.length} chains and ${response.data.subscriptions.length} subscriptions`,
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch subscriptions from admin-api', { error });
      throw error;
    }
  }

  /**
   * Fetch subscriptions for a specific chain
   */
  async getSubscriptionsByChainId(chainId: number): Promise<Subscription[]> {
    try {
      const response = await this.client.get<Subscription[]>(
        `/ingestor/subscriptions/chain/${chainId}`,
      );
      logger.info(
        `Fetched ${response.data.length} subscriptions for chain ${chainId}`,
      );
      return response.data;
    } catch (error) {
      logger.error(`Failed to fetch subscriptions for chain ${chainId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get chain sync status
   * Returns null if no sync status exists for the chain
   */
  async getSyncStatus(chainId: number): Promise<ChainSyncStatusResponse | null> {
    try {
      const response = await this.client.get<ChainSyncStatusResponse>(
        `/chain-sync-status/${chainId}`,
      );
      logger.info(`Fetched sync status for chain ${chainId}`, {
        latestBlockNumber: response.data.latestBlockNumber,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        logger.info(`No sync status found for chain ${chainId}`);
        return null;
      }
      logger.error(`Failed to fetch sync status for chain ${chainId}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Update chain sync status
   */
  async updateSyncStatus(
    chainId: number,
    status: UpdateSyncStatusRequest,
  ): Promise<void> {
    try {
      await this.client.put(`/chain-sync-status/${chainId}`, status);
      logger.debug(`Updated sync status for chain ${chainId}`, { status });
    } catch (error) {
      logger.error(`Failed to update sync status for chain ${chainId}`, {
        error,
      });
      throw error;
    }
  }
}
