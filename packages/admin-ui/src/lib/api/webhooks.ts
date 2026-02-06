import apiClient from './client';
import type {
  Webhook,
  PaginatedResponse,
  CreateWebhookDto,
  UpdateWebhookDto,
} from '@/types';

export async function getWebhooks(
  appId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Webhook>> {
  const response = await apiClient.get<PaginatedResponse<Webhook>>(
    `/applications/${appId}/webhooks`,
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function getWebhook(id: string): Promise<Webhook> {
  const response = await apiClient.get<Webhook>(`/webhooks/${id}`);
  return response.data;
}

export async function createWebhook(
  appId: string,
  data: CreateWebhookDto
): Promise<Webhook> {
  const response = await apiClient.post<Webhook>(
    `/applications/${appId}/webhooks`,
    data
  );
  return response.data;
}

export async function updateWebhook(
  id: string,
  data: UpdateWebhookDto
): Promise<Webhook> {
  const response = await apiClient.patch<Webhook>(`/webhooks/${id}`, data);
  return response.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await apiClient.delete(`/webhooks/${id}`);
}

export async function testWebhook(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/webhooks/${id}/test`
  );
  return response.data;
}

export async function healthCheckWebhook(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.get<{ success: boolean; message: string }>(
    `/webhooks/${id}/health`
  );
  return response.data;
}
