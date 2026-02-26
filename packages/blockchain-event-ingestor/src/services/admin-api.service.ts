import axios, { AxiosInstance } from 'axios';
import { Config } from '../config';
import {
  IngestorSubscriptionsResponse,
  Subscription,
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
        'X-Internal-Key': config.adminApi.internalApiKey,
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

}
