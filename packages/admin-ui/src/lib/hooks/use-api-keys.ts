import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeys, createApiKey, revokeApiKey } from '@/lib/api/api-keys';
import type { CreateApiKeyDto } from '@/types';

export const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
  list: (appId: string, page: number, limit: number) =>
    [...apiKeyKeys.lists(), appId, { page, limit }] as const,
};

export function useApiKeys(appId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: apiKeyKeys.list(appId, page, limit),
    queryFn: () => getApiKeys(appId, page, limit),
    enabled: !!appId,
  });
}

export function useCreateApiKey(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => createApiKey(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}

export function useRevokeApiKey(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) => revokeApiKey(appId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiKeyKeys.lists() });
    },
  });
}
