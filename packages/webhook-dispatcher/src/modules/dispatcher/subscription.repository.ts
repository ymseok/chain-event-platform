import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RetryPolicy } from '../../common/interfaces';

export interface SubscriptionWithWebhook {
  id: string;
  eventId: string;
  webhookId: string;
  filterConditions: unknown;
  status: string;
  event: {
    id: string;
    name: string;
    signature: string;
  };
  webhook: {
    id: string;
    name: string;
    url: string;
    secret: string;
    headers: Record<string, string> | null;
    retryPolicy: RetryPolicy;
    status: string;
  };
}

@Injectable()
export class SubscriptionRepository {
  private readonly logger = new Logger(SubscriptionRepository.name);

  constructor(private prisma: PrismaService) {}

  async findByIdWithWebhook(
    subscriptionId: string,
  ): Promise<SubscriptionWithWebhook | null> {
    const subscription = await this.prisma.eventSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        event: true,
        webhook: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      eventId: subscription.eventId,
      webhookId: subscription.webhookId,
      filterConditions: subscription.filterConditions,
      status: subscription.status,
      event: {
        id: subscription.event.id,
        name: subscription.event.name,
        signature: subscription.event.signature,
      },
      webhook: {
        id: subscription.webhook.id,
        name: subscription.webhook.name,
        url: subscription.webhook.url,
        secret: subscription.webhook.secret,
        headers: subscription.webhook.headers as Record<string, string> | null,
        retryPolicy: subscription.webhook.retryPolicy as unknown as RetryPolicy,
        status: subscription.webhook.status,
      },
    };
  }
}
