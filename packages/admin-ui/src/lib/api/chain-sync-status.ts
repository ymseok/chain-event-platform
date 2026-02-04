import { ChainSyncStatus } from '@/types';
import { apiClient } from './client';

export async function getChainSyncStatuses(): Promise<ChainSyncStatus[]> {
  const response = await apiClient.get<ChainSyncStatus[]>('/chain-sync-status');
  return response.data;
}

export async function getChainSyncStatus(chainId: number): Promise<ChainSyncStatus> {
  const response = await apiClient.get<ChainSyncStatus>(`/chain-sync-status/${chainId}`);
  return response.data;
}

export async function triggerIngestorRefresh(): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/ingestor/refresh');
  return response.data;
}
