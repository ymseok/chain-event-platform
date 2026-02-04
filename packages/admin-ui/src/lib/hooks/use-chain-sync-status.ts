import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChainSyncStatuses,
  getChainSyncStatus,
  triggerIngestorRefresh,
} from '../api/chain-sync-status';

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

export function useTriggerIngestorRefresh() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerIngestorRefresh,
    onSuccess: () => {
      // Invalidate chain sync status queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: chainSyncStatusKeys.all });
    },
  });
}
