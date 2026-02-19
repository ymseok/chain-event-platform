import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppRole } from '@prisma/client';
import { MembersRepository } from './members.repository';
import { UsersService } from '../users/users.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { InviteResponseDto } from './dto/invite-response.dto';
import {
  EntityNotFoundException,
  ForbiddenException,
  ValidationException,
  DuplicateEntityException,
} from '../../common/exceptions';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  OWNER: 3,
  MEMBER: 2,
  GUEST: 1,
};

@Injectable()
export class MembersService {
  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly usersService: UsersService,
  ) {}

  async getMemberRole(userId: string, applicationId: string): Promise<AppRole | null> {
    const member = await this.membersRepository.findMemberByAppAndUser(applicationId, userId);
    return member?.role ?? null;
  }

  hasMinimumRole(userRole: AppRole, minimumRole: AppRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
  }

  async createMembership(
    applicationId: string,
    userId: string,
    role: AppRole,
  ): Promise<MemberResponseDto> {
    const member = await this.membersRepository.createMember(applicationId, userId, role);
    return MemberResponseDto.fromEntity(member);
  }

  async getMembers(applicationId: string): Promise<MemberResponseDto[]> {
    const members = await this.membersRepository.findMembersByApplicationId(applicationId);
    return members.map(MemberResponseDto.fromEntity);
  }

  async inviteMember(
    inviterId: string,
    applicationId: string,
    dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    // Check that the invited email belongs to a registered user
    const invitedUser = await this.usersService.findByEmail(dto.email);
    if (!invitedUser) {
      throw new ValidationException('User with this email is not registered');
    }

    // Check if user is already a member
    const existingMember = await this.membersRepository.findMemberByAppAndUser(
      applicationId,
      invitedUser.id,
    );
    if (existingMember) {
      throw new DuplicateEntityException('Member', 'email');
    }

    // Check for existing pending invite
    const existingInvite = await this.membersRepository.findPendingInviteByAppAndEmail(
      applicationId,
      dto.email,
    );
    if (existingInvite) {
      throw new DuplicateEntityException('Invite', 'email');
    }

    // Cannot invite as OWNER (ownership is assigned differently)
    const role = dto.role || AppRole.MEMBER;
    if (role === AppRole.OWNER) {
      throw new ValidationException('Cannot invite as OWNER. Promote an existing member instead.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invite = await this.membersRepository.createInvite({
      applicationId,
      email: dto.email,
      role,
      invitedBy: inviterId,
      token,
      expiresAt,
    });

    return InviteResponseDto.fromEntity(invite);
  }

  async updateMemberRole(
    applicationId: string,
    memberId: string,
    newRole: AppRole,
  ): Promise<MemberResponseDto> {
    const member = await this.membersRepository.findMemberById(memberId);
    if (!member || member.applicationId !== applicationId) {
      throw new EntityNotFoundException('Member', memberId);
    }

    // Last-owner protection: if demoting from OWNER, check there's at least one other OWNER
    if (member.role === AppRole.OWNER && newRole !== AppRole.OWNER) {
      const ownerCount = await this.membersRepository.countOwners(applicationId);
      if (ownerCount <= 1) {
        throw new ValidationException('Cannot demote the last owner of an application');
      }
    }

    const updated = await this.membersRepository.updateMemberRole(memberId, newRole);
    return MemberResponseDto.fromEntity(updated);
  }

  async removeMember(applicationId: string, memberId: string): Promise<void> {
    const member = await this.membersRepository.findMemberById(memberId);
    if (!member || member.applicationId !== applicationId) {
      throw new EntityNotFoundException('Member', memberId);
    }

    // Last-owner protection
    if (member.role === AppRole.OWNER) {
      const ownerCount = await this.membersRepository.countOwners(applicationId);
      if (ownerCount <= 1) {
        throw new ValidationException('Cannot remove the last owner of an application');
      }
    }

    await this.membersRepository.deleteMember(memberId);
  }

  async leaveApplication(applicationId: string, userId: string): Promise<void> {
    const member = await this.membersRepository.findMemberByAppAndUser(applicationId, userId);
    if (!member) {
      throw new EntityNotFoundException('Membership');
    }

    // Last-owner protection
    if (member.role === AppRole.OWNER) {
      const ownerCount = await this.membersRepository.countOwners(applicationId);
      if (ownerCount <= 1) {
        throw new ValidationException(
          'Cannot leave as the last owner. Transfer ownership first.',
        );
      }
    }

    await this.membersRepository.deleteMemberByAppAndUser(applicationId, userId);
  }

  async getInvites(applicationId: string): Promise<InviteResponseDto[]> {
    const invites =
      await this.membersRepository.findPendingInvitesByApplicationId(applicationId);
    return invites.map(InviteResponseDto.fromEntity);
  }

  async cancelInvite(applicationId: string, inviteId: string): Promise<void> {
    const invite = await this.membersRepository.findInviteById(inviteId);
    if (!invite || invite.applicationId !== applicationId) {
      throw new EntityNotFoundException('Invite', inviteId);
    }

    await this.membersRepository.deleteInvite(inviteId);
  }

  async getMyPendingInvites(email: string): Promise<InviteResponseDto[]> {
    const invites = await this.membersRepository.findPendingInvitesByEmail(email);
    // Filter out expired invites
    const now = new Date();
    return invites
      .filter((invite) => invite.expiresAt > now)
      .map(InviteResponseDto.fromEntity);
  }

  async acceptInvite(userId: string, email: string, token: string): Promise<MemberResponseDto> {
    const invite = await this.membersRepository.findInviteByToken(token);
    if (!invite) {
      throw new EntityNotFoundException('Invite');
    }

    if (invite.email !== email) {
      throw new ForbiddenException('This invite is not for your account');
    }

    if (invite.status !== 'PENDING') {
      throw new ValidationException('This invite has already been processed');
    }

    if (invite.expiresAt < new Date()) {
      await this.membersRepository.updateInviteStatus(invite.id, 'EXPIRED');
      throw new ValidationException('This invite has expired');
    }

    // Create membership
    const member = await this.membersRepository.createMember(
      invite.applicationId,
      userId,
      invite.role,
    );

    // Mark invite as accepted
    await this.membersRepository.updateInviteStatus(invite.id, 'ACCEPTED');

    return MemberResponseDto.fromEntity(member);
  }

  async declineInvite(email: string, token: string): Promise<void> {
    const invite = await this.membersRepository.findInviteByToken(token);
    if (!invite) {
      throw new EntityNotFoundException('Invite');
    }

    if (invite.email !== email) {
      throw new ForbiddenException('This invite is not for your account');
    }

    if (invite.status !== 'PENDING') {
      throw new ValidationException('This invite has already been processed');
    }

    await this.membersRepository.updateInviteStatus(invite.id, 'DECLINED');
  }
}
