import { Injectable } from '@nestjs/common';
import { AppRole } from '@prisma/client';
import { ApplicationsRepository } from './applications.repository';
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
    // Root users see ALL applications
    const [applications, total] = isRoot
      ? await this.applicationsRepository.findAll(pagination.skip, pagination.take)
      : await this.applicationsRepository.findAllByMembership(
          userId,
          pagination.skip,
          pagination.take,
        );

    // Fetch roles for each application
    const dtos = await Promise.all(
      applications.map(async (app) => {
        const role = isRoot
          ? (await this.membersService.getMemberRole(userId, app.id)) ?? undefined
          : ((await this.membersService.getMemberRole(userId, app.id)) as AppRole);
        return ApplicationResponseDto.fromEntity(app, role);
      }),
    );

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
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    await this.validateAccess(userId, id, AppRole.GUEST, isRoot);

    const role = await this.membersService.getMemberRole(userId, id);
    return ApplicationResponseDto.fromEntity(application, role ?? undefined);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateApplicationDto,
    isRoot: boolean,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    await this.validateAccess(userId, id, AppRole.OWNER, isRoot);

    const updated = await this.applicationsRepository.update(id, updateDto);
    const role = await this.membersService.getMemberRole(userId, id);
    return ApplicationResponseDto.fromEntity(updated, role ?? undefined);
  }

  async remove(userId: string, id: string, isRoot: boolean): Promise<void> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    await this.validateAccess(userId, id, AppRole.OWNER, isRoot);

    await this.applicationsRepository.delete(id);
  }

  async validateAccess(
    userId: string,
    applicationId: string,
    minimumRole: AppRole = AppRole.GUEST,
    isRoot: boolean = false,
  ): Promise<void> {
    // Root users bypass all application-level checks
    if (isRoot) return;

    const application = await this.applicationsRepository.findById(applicationId);
    if (!application) {
      throw new EntityNotFoundException('Application', applicationId);
    }

    const role = await this.membersService.getMemberRole(userId, applicationId);
    if (!role) {
      throw new ForbiddenException('You do not have access to this application');
    }

    if (!this.membersService.hasMinimumRole(role, minimumRole)) {
      throw new ForbiddenException('You do not have the required role for this operation');
    }
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
