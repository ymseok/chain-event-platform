import { Injectable } from '@nestjs/common';
import { ApplicationsRepository } from './applications.repository';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { EntityNotFoundException, ForbiddenException } from '../../common/exceptions';

@Injectable()
export class ApplicationsService {
  constructor(private readonly applicationsRepository: ApplicationsRepository) {}

  async create(userId: string, createDto: CreateApplicationDto): Promise<ApplicationResponseDto> {
    const application = await this.applicationsRepository.create({
      ...createDto,
      user: { connect: { id: userId } },
    });
    return ApplicationResponseDto.fromEntity(application);
  }

  async findAllByUserId(
    userId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ApplicationResponseDto>> {
    const [applications, total] = await this.applicationsRepository.findAllByUserId(
      userId,
      pagination.skip,
      pagination.take,
    );

    return PaginatedResponseDto.create(
      applications.map(ApplicationResponseDto.fromEntity),
      { page: pagination.page || 1, limit: pagination.limit || 20, total },
    );
  }

  async findOne(userId: string, id: string): Promise<ApplicationResponseDto> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }
    return ApplicationResponseDto.fromEntity(application);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    const updated = await this.applicationsRepository.update(id, updateDto);
    return ApplicationResponseDto.fromEntity(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const application = await this.applicationsRepository.findById(id);
    if (!application) {
      throw new EntityNotFoundException('Application', id);
    }
    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    await this.applicationsRepository.delete(id);
  }

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
