import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RetryPolicy } from '../../common/interfaces';

export interface ActiveApplication {
  id: string;
  name: string;
}

export interface SubscriptionWithWebhook {
  id: string;
  eventId: string;
  webhookId: string;
  filterConditions: unknown;
  status: string;
  event: {
    id: string;
    name: string;
    signature: string;
  };
  webhook: {
    id: string;
    name: string;
    url: string;
    secret: string;
    headers: Record<string, string> | null;
    retryPolicy: RetryPolicy;
    status: string;
  };
}

@Injectable()
export class AdminApiService {
  private readonly logger = new Logger(AdminApiService.name);
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get<string>('adminApi.url'),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': this.configService.get<string>(
          'adminApi.internalApiKey',
        ),
      },
    });
  }

  async getActiveApplications(): Promise<ActiveApplication[]> {
    try {
      const response = await this.client.get<ActiveApplication[]>(
        '/dispatcher/applications/active',
      );
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch active applications from admin-api', {
        error,
      });
      throw error;
    }
  }

  async getApplicationById(id: string): Promise<ActiveApplication | null> {
    try {
      const response = await this.client.get<ActiveApplication>(
        `/dispatcher/applications/${id}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch application ${id} from admin-api`, {
        error,
      });
      throw error;
    }
  }

  async getSubscriptionById(
    id: string,
  ): Promise<SubscriptionWithWebhook | null> {
    try {
      const response = await this.client.get<SubscriptionWithWebhook>(
        `/dispatcher/subscriptions/${id}`,
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch subscription ${id} from admin-api`, {
        error,
      });
      throw error;
    }
  }
}
