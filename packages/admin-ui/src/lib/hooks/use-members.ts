import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  leaveApplication,
  getInvites,
  cancelInvite,
  getMyPendingInvites,
  acceptInvite,
  declineInvite,
} from '@/lib/api/members';
import { applicationKeys } from './use-applications';
import type { CreateInviteDto, UpdateMemberRoleDto } from '@/types';

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (appId: string) => [...memberKeys.lists(), appId] as const,
};

export const inviteKeys = {
  all: ['invites'] as const,
  lists: () => [...inviteKeys.all, 'list'] as const,
  list: (appId: string) => [...inviteKeys.lists(), appId] as const,
  pending: () => [...inviteKeys.all, 'pending'] as const,
};

export function useMembers(appId: string) {
  return useQuery({
    queryKey: memberKeys.list(appId),
    queryFn: () => getMembers(appId),
    enabled: !!appId,
  });
}

export function useInviteMember(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInviteDto) => inviteMember(appId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(appId) });
      queryClient.invalidateQueries({ queryKey: inviteKeys.list(appId) });
    },
  });
}

export function useUpdateMemberRole(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      data,
    }: {
      memberId: string;
      data: UpdateMemberRoleDto;
    }) => updateMemberRole(appId, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(appId) });
    },
  });
}

export function useRemoveMember(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeMember(appId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list(appId) });
    },
  });
}

export function useLeaveApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appId: string) => leaveApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}

export function useInvites(appId: string) {
  return useQuery({
    queryKey: inviteKeys.list(appId),
    queryFn: () => getInvites(appId),
    enabled: !!appId,
  });
}

export function useCancelInvite(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) => cancelInvite(appId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.list(appId) });
    },
  });
}

export function useMyPendingInvites() {
  return useQuery({
    queryKey: inviteKeys.pending(),
    queryFn: () => getMyPendingInvites(),
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => acceptInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.pending() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.lists() });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => declineInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.pending() });
    },
  });
}
