import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWebhookLogs,
  getWebhookLog,
  retryWebhookLog,
  getWebhookLogStats,
} from '@/lib/api/webhook-logs';
import type { WebhookLogStatus } from '@/types';

export const webhookLogKeys = {
  all: ['webhook-logs'] as const,
  lists: () => [...webhookLogKeys.all, 'list'] as const,
  list: (
    webhookId: string,
    page: number,
    limit: number,
    status?: WebhookLogStatus
  ) => [...webhookLogKeys.lists(), webhookId, { page, limit, status }] as const,
  details: () => [...webhookLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookLogKeys.details(), id] as const,
  stats: (webhookId: string, days: number) =>
    [...webhookLogKeys.all, 'stats', webhookId, { days }] as const,
};

export function useWebhookLogs(
  webhookId: string,
  page = 1,
  limit = 20,
  status?: WebhookLogStatus
) {
  return useQuery({
    queryKey: webhookLogKeys.list(webhookId, page, limit, status),
    queryFn: () => getWebhookLogs(webhookId, { page, limit, status }),
    enabled: !!webhookId,
  });
}

export function useWebhookLog(id: string) {
  return useQuery({
    queryKey: webhookLogKeys.detail(id),
    queryFn: () => getWebhookLog(id),
    enabled: !!id,
  });
}

export function useRetryWebhookLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryWebhookLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookLogKeys.lists() });
    },
  });
}

export function useWebhookLogStats(
  webhookId: string,
  days = 30,
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: webhookLogKeys.stats(webhookId, days),
    queryFn: () => getWebhookLogStats(webhookId, days),
    enabled: !!webhookId,
    refetchInterval: options?.refetchInterval,
  });
}
