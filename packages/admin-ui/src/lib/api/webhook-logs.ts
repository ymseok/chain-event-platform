import apiClient from './client';
import type { WebhookLog, PaginatedResponse, WebhookLogStatus } from '@/types';

interface GetWebhookLogsParams {
  page?: number;
  limit?: number;
  status?: WebhookLogStatus;
}

export async function getWebhookLogs(
  webhookId: string,
  params: GetWebhookLogsParams = {}
): Promise<PaginatedResponse<WebhookLog>> {
  const { page = 1, limit = 20, status } = params;
  const response = await apiClient.get<PaginatedResponse<WebhookLog>>(
    `/webhooks/${webhookId}/logs`,
    {
      params: { page, limit, status },
    }
  );
  return response.data;
}

export async function getWebhookLog(id: string): Promise<WebhookLog> {
  const response = await apiClient.get<WebhookLog>(`/webhook-logs/${id}`);
  return response.data;
}

export async function retryWebhookLog(id: string): Promise<WebhookLog> {
  const response = await apiClient.post<WebhookLog>(`/webhook-logs/${id}/retry`);
  return response.data;
}
