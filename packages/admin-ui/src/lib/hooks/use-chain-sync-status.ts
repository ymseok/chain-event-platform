import { useQuery } from '@tanstack/react-query';
import { getChainSyncStatuses, getChainSyncStatus } from '../api/chain-sync-status';

const chainSyncStatusKeys = {
  all: ['chain-sync-status'] as const,
  lists: () => [...chainSyncStatusKeys.all, 'list'] as const,
  detail: (chainId: number) => [...chainSyncStatusKeys.all, 'detail', chainId] as const,
};

export function useChainSyncStatuses() {
  return useQuery({
    queryKey: chainSyncStatusKeys.lists(),
    queryFn: getChainSyncStatuses,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });
}

export function useChainSyncStatus(chainId: number) {
  return useQuery({
    queryKey: chainSyncStatusKeys.detail(chainId),
    queryFn: () => getChainSyncStatus(chainId),
    enabled: !!chainId,
    refetchInterval: 10000,
  });
}
