import apiClient from './client';
import type { DispatcherInstancesResponse, RebalanceResponse } from '@/types';

export async function getDispatcherInstances(): Promise<DispatcherInstancesResponse> {
  const response = await apiClient.get<DispatcherInstancesResponse>(
    '/dispatcher/instances',
  );
  return response.data;
}

export async function rebalanceDispatchers(): Promise<RebalanceResponse> {
  const response = await apiClient.post<RebalanceResponse>(
    '/dispatcher/rebalance',
  );
  return response.data;
}
