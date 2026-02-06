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
