import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getIngestorInstances,
  rebalanceIngestors,
} from '@/lib/api/ingestor';

export const ingestorKeys = {
  all: ['ingestor'] as const,
  instances: () => [...ingestorKeys.all, 'instances'] as const,
};

export function useIngestorInstances() {
  return useQuery({
    queryKey: ingestorKeys.instances(),
    queryFn: getIngestorInstances,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useRebalanceIngestors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rebalanceIngestors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingestorKeys.instances() });
    },
  });
}
