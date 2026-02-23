import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDispatcherInstances,
  rebalanceDispatchers,
} from '@/lib/api/dispatcher';

export const dispatcherKeys = {
  all: ['dispatcher'] as const,
  instances: () => [...dispatcherKeys.all, 'instances'] as const,
};

export function useDispatcherInstances() {
  return useQuery({
    queryKey: dispatcherKeys.instances(),
    queryFn: getDispatcherInstances,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useRebalanceDispatchers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rebalanceDispatchers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dispatcherKeys.instances() });
    },
  });
}
