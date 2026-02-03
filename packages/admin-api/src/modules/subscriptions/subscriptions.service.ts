import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';
import { ApplicationsService } from '../applications/applications.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { EntityNotFoundException } from '../../common/exceptions';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async create(
    userId: string,
    applicationId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const subscription = await this.subscriptionsRepository.create({
      eventId: createDto.eventId,
      webhookId: createDto.webhookId,
      filterConditions: createDto.filterConditions
        ? (createDto.filterConditions as object)
        : undefined,
    });

    return SubscriptionResponseDto.fromEntity(subscription);
  }

  async findAllByApplicationId(
    userId: string,
    applicationId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SubscriptionResponseDto>> {
    await this.applicationsService.validateOwnership(userId, applicationId);

    const [subscriptions, total] = await this.subscriptionsRepository.findAllByApplicationId(
      applicationId,
      pagination.skip,
      pagination.take,
    );

    return PaginatedResponseDto.create(subscriptions.map(SubscriptionResponseDto.fromEntity), {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total,
    });
  }

  async findOne(userId: string, id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException('EventSubscription', id);
    }
    return SubscriptionResponseDto.fromEntity(subscription);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException('EventSubscription', id);
    }

    const updated = await this.subscriptionsRepository.update(id, {
      filterConditions: updateDto.filterConditions
        ? (updateDto.filterConditions as object)
        : undefined,
      status: updateDto.status as 'ACTIVE' | 'PAUSED' | undefined,
    });
    return SubscriptionResponseDto.fromEntity(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException('EventSubscription', id);
    }
    await this.subscriptionsRepository.delete(id);
  }

  async toggleStatus(userId: string, id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsRepository.findById(id);
    if (!subscription) {
      throw new EntityNotFoundException('EventSubscription', id);
    }

    const newStatus = subscription.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await this.subscriptionsRepository.update(id, { status: newStatus });
    return SubscriptionResponseDto.fromEntity(updated);
  }
}
