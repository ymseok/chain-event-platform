import { Injectable } from '@nestjs/common';
import { Application, AppRole } from '@prisma/client';
import { ApplicationsRepository, ApplicationWithMembers } from './applications.repository';
import { MembersService } from '../members/members.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { EntityNotFoundException, ForbiddenException } from '../../common/exceptions';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly applicationsRepository: ApplicationsRepository,
    private readonly membersService: MembersService,
  ) {}

  async create(userId: string, createDto: CreateApplicationDto): Promise<ApplicationResponseDto> {
    const application = await this.applicationsRepository.create({
      ...createDto,
      user: { connect: { id: userId } },
    });

    // Automatically make creator an OWNER member
    await this.membersService.createMembership(application.id, userId, AppRole.OWNER);

    return ApplicationResponseDto.fromEntity(application, AppRole.OWNER);
  }

  async findAllByUserId(
    userId: string,
    isRoot: boolean,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ApplicationResponseDto>> {
    // Root users see ALL applications; include members to extract role without N+1
    const [applications, total] = isRoot
      ? await this.applicationsRepository.findAll(pagination.skip, pagination.take, { userId })
      : await this.applicationsRepository.findAllByMembership(
          userId,
          pagination.skip,
          pagination.take,
        );

    // Extract role from included members data (no extra DB queries)
    const dtos = (applications as ApplicationWithMembers[]).map((app) => {
      const role = app.members?.[0]?.role;
      return ApplicationResponseDto.fromEntity(app, role ?? undefined);
    });

    return PaginatedResponseDto.create(dtos, {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total,
    });
  }

  async findOne(
    userId: string,
    id: string,
    isRoot: boolean,
  ): Promise<ApplicationResponseDto> {
    const application = await this.findByIdOrThrow(id);
    const role = await this.validateAccess(userId, application, AppRole.GUEST, isRoot);

    // Root users bypass validateAccess (returns null), but still need their
    // actual membership role for the response DTO.
    const myRole =
      role ?? (await this.membersService.getMemberRole(userId, application.id)) ?? undefined;

    return ApplicationResponseDto.fromEntity(application, myRole);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateApplicationDto,
    isRoot: boolean,
  ): Promise<ApplicationResponseDto> {
    await this.findByIdOrThrow(id);
    const role = await this.validateAccess(userId, id, AppRole.OWNER, isRoot);

    const updated = await this.applicationsRepository.update(id, updateDto);

    const myRole =
      role ?? (await this.membersService.getMemberRole(userId, updated.id)) ?? undefined;
    return ApplicationResponseDto.fromEntity(updated, myRole);
  }

  async remove(userId: string, id: string, isRoot: boolean): Promise<void> {
    await this.findByIdOrThrow(id);
    await this.validateAccess(userId, id, AppRole.OWNER, isRoot);

    await this.applicationsRepository.delete(id);
  }

  /**
   * Validates user access to an application with minimum role check.
   * Accepts either an applicationId (string) or a pre-fetched Application object
   * to avoid redundant DB lookups. Returns the user's role (null for root users).
   */
  async validateAccess(
    userId: string,
    applicationOrId: string | Application,
    minimumRole: AppRole = AppRole.GUEST,
    isRoot: boolean = false,
  ): Promise<AppRole | null> {
    // Root users bypass all application-level checks
    if (isRoot) return null;

    const applicationId =
      typeof applicationOrId === 'string' ? applicationOrId : applicationOrId.id;

    if (typeof applicationOrId === 'string') {
      const application = await this.applicationsRepository.findById(applicationOrId);
      if (!application) {
        throw new EntityNotFoundException('Application', applicationOrId);
      }
    }

    const role = await this.membersService.getMemberRole(userId, applicationId);
    if (!role) {
      throw new ForbiddenException('You do not have access to this application');
    }

    if (!this.membersService.hasMinimumRole(role, minimumRole)) {
      throw new ForbiddenException('You do not have the required role for this operation');
    }

    return role;
  }

  private async findByIdOrThrow(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    return application;
  }

  /** @deprecated Use validateAccess instead */
  async validateOwnership(userId: string, applicationId: string): Promise<void> {
    const application = await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new EntityNotFoundException('Application', applicationId);
    }
    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }
}
