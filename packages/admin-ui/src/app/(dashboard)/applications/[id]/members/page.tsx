'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Users, Trash2, X, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState, ConfirmDialog } from '@/components/common';
import {
  useMembers,
  useInvites,
  useUpdateMemberRole,
  useRemoveMember,
  useLeaveApplication,
  useCancelInvite,
} from '@/lib/hooks';
import { useApplication } from '@/lib/hooks';
import { useAuthStore } from '@/lib/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { InviteMemberDialog } from './invite-member-dialog';
import type { Member, AppRole } from '@/types';

const roleBadgeVariant: Record<AppRole, 'default' | 'secondary' | 'outline'> =
  {
    OWNER: 'default',
    MEMBER: 'secondary',
    GUEST: 'outline',
  };

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;
  const user = useAuthStore((state) => state.user);

  const { data: app } = useApplication(appId);
  const { data: members, isLoading: membersLoading } = useMembers(appId);
  const { data: invites, isLoading: invitesLoading } = useInvites(appId);

  const updateRoleMutation = useUpdateMemberRole(appId);
  const removeMutation = useRemoveMember(appId);
  const leaveMutation = useLeaveApplication();
  const cancelInviteMutation = useCancelInvite(appId);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const isOwner = app?.myRole === 'OWNER';
  const currentMember = members?.find((m) => m.userId === user?.id);
  const ownerCount =
    members?.filter((m) => m.role === 'OWNER').length ?? 0;

  const handleRoleChange = async (memberId: string, newRole: AppRole) => {
    try {
      await updateRoleMutation.mutateAsync({
        memberId,
        data: { role: newRole },
      });
      toast.success('Role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMutation.mutateAsync(memberToRemove.id);
      toast.success('Member removed');
      setMemberToRemove(null);
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync(appId);
      toast.success('You left the application');
      router.push('/applications');
    } catch {
      toast.error('Failed to leave application');
    }
  };

  const handleCancelInvite = async () => {
    if (!inviteToCancel) return;
    try {
      await cancelInviteMutation.mutateAsync(inviteToCancel);
      toast.success('Invite cancelled');
      setInviteToCancel(null);
    } catch {
      toast.error('Failed to cancel invite');
    }
  };

  const isLastOwner = (member: Member) =>
    member.role === 'OWNER' && ownerCount <= 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {isOwner && (
          <Button onClick={() => setIsInviteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          {!membersLoading && (!members || members.length === 0) ? (
            <EmptyState
              icon={Users}
              title="No members"
              description="This application has no members yet."
            />
          ) : membersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {members?.map((member) => {
                const isCurrentUser = member.userId === user?.id;
                const canChangeRole =
                  isOwner && !isCurrentUser && !isLastOwner(member);
                const canRemove = isOwner && !isCurrentUser;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {member.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canChangeRole ? (
                        <Select
                          value={member.role}
                          onValueChange={(value: string) =>
                            handleRoleChange(member.id, value as AppRole)
                          }
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">Owner</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="GUEST">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleBadgeVariant[member.role]}>
                          {member.role}
                        </Badge>
                      )}

                      <span className="text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">
                        {formatDate(member.createdAt)}
                      </span>

                      {isCurrentUser && !isLastOwner(member) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setShowLeaveDialog(true)}
                          title="Leave application"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      ) : canRemove ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites (Owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-md bg-muted"
                  />
                ))}
              </div>
            ) : !invites || invites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending invites
              </p>
            ) : (
              <div className="divide-y">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited as{' '}
                        <Badge
                          variant={roleBadgeVariant[invite.role]}
                          className="ml-1"
                        >
                          {invite.role}
                        </Badge>
                        <span className="ml-2">
                          &middot; Expires {formatDate(invite.expiresAt)}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setInviteToCancel(invite.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <InviteMemberDialog
        appId={appId}
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${memberToRemove?.name || memberToRemove?.email} from this application?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleRemoveMember}
        isLoading={removeMutation.isPending}
      />

      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="Leave Application"
        description="Are you sure you want to leave this application? You will lose access to all resources."
        confirmLabel="Leave"
        variant="destructive"
        onConfirm={handleLeave}
        isLoading={leaveMutation.isPending}
      />

      <ConfirmDialog
        open={!!inviteToCancel}
        onOpenChange={(open) => !open && setInviteToCancel(null)}
        title="Cancel Invite"
        description="Are you sure you want to cancel this invitation?"
        confirmLabel="Cancel Invite"
        variant="destructive"
        onConfirm={handleCancelInvite}
        isLoading={cancelInviteMutation.isPending}
      />
    </div>
  );
}
