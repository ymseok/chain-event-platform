import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateInviteDto, UpdateMemberRoleDto, MemberResponseDto, InviteResponseDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import { ForbiddenException } from '../../common/exceptions';
import { AppRole } from '@prisma/client';

@ApiTags('Members')
@ApiBearerAuth()
@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // ─── Application-scoped member endpoints ───

  @Get('applications/:appId/members')
  @ApiOperation({ summary: 'List application members' })
  @ApiResponse({ status: 200, type: [MemberResponseDto] })
  async getMembers(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<MemberResponseDto[]> {
    await this.requireRole(user, appId, 'GUEST');
    return this.membersService.getMembers(appId);
  }

  @Post('applications/:appId/members/invite')
  @ApiOperation({ summary: 'Invite a user to the application' })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  async invite(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    await this.requireRole(user, appId, 'OWNER');
    return this.membersService.inviteMember(user.id, appId, dto);
  }

  @Patch('applications/:appId/members/:memberId/role')
  @ApiOperation({ summary: 'Change member role' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  async updateRole(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    await this.requireRole(user, appId, 'OWNER');
    return this.membersService.updateMemberRole(appId, memberId, dto.role);
  }

  @Delete('applications/:appId/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the application' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<void> {
    await this.requireRole(user, appId, 'OWNER');
    return this.membersService.removeMember(appId, memberId);
  }

  @Delete('applications/:appId/members/me')
  @ApiOperation({ summary: 'Leave the application' })
  @ApiResponse({ status: 200, description: 'Left application' })
  async leaveApplication(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<void> {
    return this.membersService.leaveApplication(appId, user.id);
  }

  // ─── Application-scoped invite endpoints ───

  @Get('applications/:appId/invites')
  @ApiOperation({ summary: 'List pending invites for the application' })
  @ApiResponse({ status: 200, type: [InviteResponseDto] })
  async getInvites(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
  ): Promise<InviteResponseDto[]> {
    await this.requireRole(user, appId, 'OWNER');
    return this.membersService.getInvites(appId);
  }

  @Delete('applications/:appId/invites/:inviteId')
  @ApiOperation({ summary: 'Cancel a pending invite' })
  @ApiResponse({ status: 200, description: 'Invite cancelled' })
  async cancelInvite(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) appId: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ): Promise<void> {
    await this.requireRole(user, appId, 'OWNER');
    return this.membersService.cancelInvite(appId, inviteId);
  }

  // ─── User-scoped invite endpoints ───

  @Get('invites/pending')
  @ApiOperation({ summary: 'Get my pending invites' })
  @ApiResponse({ status: 200, type: [InviteResponseDto] })
  async getMyPendingInvites(
    @CurrentUser() user: { id: string; email: string },
  ): Promise<InviteResponseDto[]> {
    return this.membersService.getMyPendingInvites(user.email);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept an invite' })
  @ApiResponse({ status: 201, type: MemberResponseDto })
  async acceptInvite(
    @CurrentUser() user: { id: string; email: string },
    @Param('token') token: string,
  ): Promise<MemberResponseDto> {
    return this.membersService.acceptInvite(user.id, user.email, token);
  }

  @Post('invites/:token/decline')
  @ApiOperation({ summary: 'Decline an invite' })
  @ApiResponse({ status: 200, description: 'Invite declined' })
  async declineInvite(
    @CurrentUser() user: { id: string; email: string },
    @Param('token') token: string,
  ): Promise<void> {
    return this.membersService.declineInvite(user.email, token);
  }

  // ─── Helper ───

  private async requireRole(
    user: { id: string; isRoot: boolean },
    applicationId: string,
    minimumRole: AppRole,
  ): Promise<void> {
    if (user.isRoot) return;

    const role = await this.membersService.getMemberRole(user.id, applicationId);
    if (!role || !this.membersService.hasMinimumRole(role, minimumRole)) {
      throw new ForbiddenException('You do not have the required role for this operation');
    }
  }
}
