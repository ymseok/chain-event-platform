import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Webhook, Prisma } from '@prisma/client';

@Injectable()
export class WebhooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WebhookUncheckedCreateInput): Promise<Webhook> {
    return this.prisma.webhook.create({ data });
  }

  async findById(id: string): Promise<Webhook | null> {
    return this.prisma.webhook.findUnique({ where: { id } });
  }

  async findAllByApplicationId(
    applicationId: string,
    skip: number,
    take: number,
  ): Promise<[(Webhook & { _count: { subscriptions: number } })[], number]> {
    const [webhooks, total] = await Promise.all([
      this.prisma.webhook.findMany({
        where: { applicationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { subscriptions: true },
          },
        },
      }),
      this.prisma.webhook.count({ where: { applicationId } }),
    ]);
    return [webhooks, total];
  }

  async update(id: string, data: Prisma.WebhookUpdateInput): Promise<Webhook> {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhook.delete({ where: { id } });
  }
}
