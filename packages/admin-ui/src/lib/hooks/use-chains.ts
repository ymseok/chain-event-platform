import { useQuery } from '@tanstack/react-query';
import { getChains, getChain } from '@/lib/api/chains';

export const chainKeys = {
  all: ['chains'] as const,
  lists: () => [...chainKeys.all, 'list'] as const,
  details: () => [...chainKeys.all, 'detail'] as const,
  detail: (id: number) => [...chainKeys.details(), id] as const,
};

export function useChains() {
  return useQuery({
    queryKey: chainKeys.lists(),
    queryFn: () => getChains(),
  });
}

export function useChain(id: number) {
  return useQuery({
    queryKey: chainKeys.detail(id),
    queryFn: () => getChain(id),
    enabled: !!id,
  });
}
