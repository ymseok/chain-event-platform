import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventSubscription, Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EventSubscriptionUncheckedCreateInput): Promise<EventSubscription> {
    return this.prisma.eventSubscription.create({
      data,
      include: { event: true, webhook: true },
    });
  }

  async findById(id: string) {
    return this.prisma.eventSubscription.findUnique({
      where: { id },
      include: { event: true, webhook: true },
    });
  }

  async findAllByApplicationId(
    applicationId: string,
    skip: number,
    take: number,
  ): Promise<[EventSubscription[], number]> {
    const [subscriptions, total] = await Promise.all([
      this.prisma.eventSubscription.findMany({
        where: {
          webhook: { applicationId },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { event: true, webhook: true },
      }),
      this.prisma.eventSubscription.count({
        where: { webhook: { applicationId } },
      }),
    ]);
    return [subscriptions, total];
  }

  async update(id: string, data: Prisma.EventSubscriptionUpdateInput): Promise<EventSubscription> {
    return this.prisma.eventSubscription.update({
      where: { id },
      data,
      include: { event: true, webhook: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.eventSubscription.delete({ where: { id } });
  }
}
