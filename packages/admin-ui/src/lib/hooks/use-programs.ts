import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
} from '@/lib/api/programs';
import type { CreateProgramDto, UpdateProgramDto } from '@/types';

export const programKeys = {
  all: ['programs'] as const,
  lists: () => [...programKeys.all, 'list'] as const,
  list: (appId: string, page: number, limit: number) =>
    [...programKeys.lists(), appId, { page, limit }] as const,
  details: () => [...programKeys.all, 'detail'] as const,
  detail: (id: string) => [...programKeys.details(), id] as const,
};

export function usePrograms(appId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: programKeys.list(appId, page, limit),
    queryFn: () => getPrograms(appId, page, limit),
    enabled: !!appId,
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: programKeys.detail(id),
    queryFn: () => getProgram(id),
    enabled: !!id,
  });
}

export function useCreateProgram(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProgramDto) => createProgram(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programKeys.lists() });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProgramDto }) =>
      updateProgram(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: programKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: programKeys.lists() });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: programKeys.lists() });
    },
  });
}
