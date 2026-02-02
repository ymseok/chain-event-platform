import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from '@/lib/api/webhooks';
import type { CreateWebhookDto, UpdateWebhookDto } from '@/types';

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (appId: string, page: number, limit: number) =>
    [...webhookKeys.lists(), appId, { page, limit }] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
};

export function useWebhooks(appId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: webhookKeys.list(appId, page, limit),
    queryFn: () => getWebhooks(appId, page, limit),
    enabled: !!appId,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => getWebhook(id),
    enabled: !!id,
  });
}

export function useCreateWebhook(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWebhookDto) => createWebhook(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWebhookDto }) =>
      updateWebhook(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => testWebhook(id),
  });
}
