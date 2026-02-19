import apiClient from './client';
import type {
  Member,
  Invite,
  CreateInviteDto,
  UpdateMemberRoleDto,
} from '@/types';

// ─── Application-scoped member endpoints ───

export async function getMembers(appId: string): Promise<Member[]> {
  const response = await apiClient.get<Member[]>(
    `/applications/${appId}/members`,
  );
  return response.data;
}

export async function inviteMember(
  appId: string,
  data: CreateInviteDto,
): Promise<Invite> {
  const response = await apiClient.post<Invite>(
    `/applications/${appId}/members/invite`,
    data,
  );
  return response.data;
}

export async function updateMemberRole(
  appId: string,
  memberId: string,
  data: UpdateMemberRoleDto,
): Promise<Member> {
  const response = await apiClient.patch<Member>(
    `/applications/${appId}/members/${memberId}/role`,
    data,
  );
  return response.data;
}

export async function removeMember(
  appId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`/applications/${appId}/members/${memberId}`);
}

export async function leaveApplication(appId: string): Promise<void> {
  await apiClient.delete(`/applications/${appId}/members/me`);
}

// ─── Application-scoped invite endpoints ───

export async function getInvites(appId: string): Promise<Invite[]> {
  const response = await apiClient.get<Invite[]>(
    `/applications/${appId}/invites`,
  );
  return response.data;
}

export async function cancelInvite(
  appId: string,
  inviteId: string,
): Promise<void> {
  await apiClient.delete(`/applications/${appId}/invites/${inviteId}`);
}

// ─── User-scoped invite endpoints ───

export async function getMyPendingInvites(): Promise<Invite[]> {
  const response = await apiClient.get<Invite[]>('/invites/pending');
  return response.data;
}

export async function acceptInvite(token: string): Promise<Member> {
  const response = await apiClient.post<Member>(`/invites/${token}/accept`);
  return response.data;
}

export async function declineInvite(token: string): Promise<void> {
  await apiClient.post(`/invites/${token}/decline`);
}
