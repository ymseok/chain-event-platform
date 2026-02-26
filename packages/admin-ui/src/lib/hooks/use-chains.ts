import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getChains,
  getChain,
  getChainsAdmin,
  getChainAdmin,
  createChain,
  updateChain,
  deleteChain,
  checkChainRpc,
} from '@/lib/api/chains';
import type { CreateChainDto, UpdateChainDto } from '@/types';

export const chainKeys = {
  all: ['chains'] as const,
  lists: () => [...chainKeys.all, 'list'] as const,
  adminLists: () => [...chainKeys.all, 'admin', 'list'] as const,
  details: () => [...chainKeys.all, 'detail'] as const,
  detail: (id: number) => [...chainKeys.details(), id] as const,
  adminDetail: (id: number) => [...chainKeys.all, 'admin', 'detail', id] as const,
};

export function useChains(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chainKeys.lists(),
    queryFn: () => getChains(),
    enabled: options?.enabled,
  });
}

export function useChain(id: number) {
  return useQuery({
    queryKey: chainKeys.detail(id),
    queryFn: () => getChain(id),
    enabled: !!id,
  });
}

export function useChainsAdmin(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chainKeys.adminLists(),
    queryFn: () => getChainsAdmin(),
    enabled: options?.enabled,
  });
}

export function useChainAdmin(id: number) {
  return useQuery({
    queryKey: chainKeys.adminDetail(id),
    queryFn: () => getChainAdmin(id),
    enabled: !!id,
  });
}

export function useCreateChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChainDto) => createChain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chainKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chainKeys.adminLists() });
    },
  });
}

export function useUpdateChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateChainDto }) =>
      updateChain(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: chainKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: chainKeys.adminDetail(id) });
      queryClient.invalidateQueries({ queryKey: chainKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chainKeys.adminLists() });
    },
  });
}

export function useDeleteChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteChain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chainKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chainKeys.adminLists() });
    },
  });
}

export function useCheckChainRpc() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => checkChainRpc(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chainKeys.lists() });
      queryClient.invalidateQueries({ queryKey: chainKeys.adminLists() });
    },
  });
}
