import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  getApplicationStats,
} from '@/lib/api/applications';
import type { CreateApplicationDto, UpdateApplicationDto } from '@/types';

export const applicationKeys = {
  all: ['applications'] as const,
  lists: () => [...applicationKeys.all, 'list'] as const,
  list: (page: number, limit: number) =>
    [...applicationKeys.lists(), { page, limit }] as const,
  details: () => [...applicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...applicationKeys.details(), id] as const,
  stats: (id: string) => [...applicationKeys.detail(id), 'stats'] as const,
};

export function useApplications(page = 1, limit = 20) {
  return useQuery({
    queryKey: applicationKeys.list(page, limit),
    queryFn: () => getApplications(page, limit),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => getApplication(id),
    enabled: !!id,
  });
}

export function useApplicationStats(
  appId: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: [...applicationKeys.stats(appId), { startDate, endDate }],
    queryFn: () => getApplicationStats(appId, startDate, endDate),
    enabled: !!appId,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateApplicationDto) => createApplication(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApplicationDto }) =>
      updateApplication(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}
