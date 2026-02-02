import apiClient from './client';
import type {
  Subscription,
  PaginatedResponse,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from '@/types';

export async function getSubscriptions(
  appId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Subscription>> {
  const response = await apiClient.get<PaginatedResponse<Subscription>>(
    `/applications/${appId}/subscriptions`,
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function getSubscription(id: string): Promise<Subscription> {
  const response = await apiClient.get<Subscription>(`/subscriptions/${id}`);
  return response.data;
}

export async function createSubscription(
  appId: string,
  data: CreateSubscriptionDto
): Promise<Subscription> {
  const response = await apiClient.post<Subscription>(
    `/applications/${appId}/subscriptions`,
    data
  );
  return response.data;
}

export async function updateSubscription(
  id: string,
  data: UpdateSubscriptionDto
): Promise<Subscription> {
  const response = await apiClient.patch<Subscription>(`/subscriptions/${id}`, data);
  return response.data;
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiClient.delete(`/subscriptions/${id}`);
}
