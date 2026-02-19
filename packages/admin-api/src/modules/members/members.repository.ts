import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppRole, InviteStatus } from '@prisma/client';

@Injectable()
export class MembersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly memberInclude = {
    user: { select: { email: true, name: true } },
  };

  private readonly inviteInclude = {
    application: { select: { name: true } },
    sender: { select: { name: true } },
  };

  async findMemberByAppAndUser(applicationId: string, userId: string) {
    return this.prisma.applicationMember.findUnique({
      where: { applicationId_userId: { applicationId, userId } },
      include: this.memberInclude,
    });
  }

  async findMemberById(id: string) {
    return this.prisma.applicationMember.findUnique({
      where: { id },
      include: this.memberInclude,
    });
  }

  async findMembersByApplicationId(applicationId: string) {
    return this.prisma.applicationMember.findMany({
      where: { applicationId },
      include: this.memberInclude,
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMember(applicationId: string, userId: string, role: AppRole) {
    return this.prisma.applicationMember.create({
      data: { applicationId, userId, role },
      include: this.memberInclude,
    });
  }

  async updateMemberRole(id: string, role: AppRole) {
    return this.prisma.applicationMember.update({
      where: { id },
      data: { role },
      include: this.memberInclude,
    });
  }

  async deleteMember(id: string): Promise<void> {
    await this.prisma.applicationMember.delete({ where: { id } });
  }

  async deleteMemberByAppAndUser(applicationId: string, userId: string): Promise<void> {
    await this.prisma.applicationMember.delete({
      where: { applicationId_userId: { applicationId, userId } },
    });
  }

  async countOwners(applicationId: string): Promise<number> {
    return this.prisma.applicationMember.count({
      where: { applicationId, role: 'OWNER' },
    });
  }

  // Invite methods

  async createInvite(data: {
    applicationId: string;
    email: string;
    role: AppRole;
    invitedBy: string;
    token: string;
    expiresAt: Date;
  }) {
    return this.prisma.applicationInvite.create({
      data,
      include: this.inviteInclude,
    });
  }

  async findInviteById(id: string) {
    return this.prisma.applicationInvite.findUnique({
      where: { id },
      include: this.inviteInclude,
    });
  }

  async findInviteByToken(token: string) {
    return this.prisma.applicationInvite.findUnique({
      where: { token },
      include: this.inviteInclude,
    });
  }

  async findPendingInvitesByApplicationId(applicationId: string) {
    return this.prisma.applicationInvite.findMany({
      where: { applicationId, status: 'PENDING' },
      include: this.inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingInvitesByEmail(email: string) {
    return this.prisma.applicationInvite.findMany({
      where: { email, status: 'PENDING' },
      include: this.inviteInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingInviteByAppAndEmail(applicationId: string, email: string) {
    return this.prisma.applicationInvite.findFirst({
      where: { applicationId, email, status: 'PENDING' },
    });
  }

  async updateInviteStatus(id: string, status: InviteStatus) {
    return this.prisma.applicationInvite.update({
      where: { id },
      data: { status },
      include: this.inviteInclude,
    });
  }

  async deleteInvite(id: string): Promise<void> {
    await this.prisma.applicationInvite.delete({ where: { id } });
  }
}
