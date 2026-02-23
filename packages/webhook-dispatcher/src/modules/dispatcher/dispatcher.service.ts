import { Injectable, Logger } from '@nestjs/common';
import { EventQueueMessage } from '../../common/interfaces';
import {
  SubscriptionRepository,
  SubscriptionWithWebhook,
} from './subscription.repository';
import { WebhookLogRepository } from './webhook-log.repository';
import { WebhookCallerService } from './webhook-caller.service';

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);
  private subscriptionCache = new Map<string, SubscriptionWithWebhook>();

  constructor(
    private subscriptionRepository: SubscriptionRepository,
    private webhookLogRepository: WebhookLogRepository,
    private webhookCallerService: WebhookCallerService,
  ) {}

  /**
   * Clear the in-memory subscription cache.
   * Call this on config:refresh signals so stale data is evicted.
   */
  invalidateCache(): void {
    const size = this.subscriptionCache.size;
    this.subscriptionCache.clear();
    if (size > 0) {
      this.logger.log(`Subscription cache invalidated (${size} entries cleared)`);
    }
  }

  async dispatch(message: EventQueueMessage): Promise<void> {
    const { subscriptionId } = message;

    let subscription = this.subscriptionCache.get(subscriptionId);
    if (!subscription) {
      subscription =
        (await this.subscriptionRepository.findByIdWithWebhook(subscriptionId)) ??
        undefined;
      if (subscription) {
        this.subscriptionCache.set(subscriptionId, subscription);
      }
    }

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }

    if (subscription.status !== 'ACTIVE') {
      this.logger.debug(
        `Subscription is not active: ${subscriptionId} (${subscription.status})`,
      );
      return;
    }

    if (subscription.webhook.status !== 'ACTIVE') {
      this.logger.debug(
        `Webhook is not active: ${subscription.webhookId} (${subscription.webhook.status})`,
      );
      return;
    }

    const payload = this.webhookCallerService.buildPayload(
      message,
      subscription,
    );
    const payloadString = JSON.stringify(payload);
    const headers = this.webhookCallerService.buildHeaders(
      payloadString,
      payload.id,
      payload.timestamp,
      subscription.webhook.secret,
      subscription.webhook.headers,
    );

    const logId = await this.webhookLogRepository.create({
      webhookId: subscription.webhookId,
      eventSubscriptionId: subscriptionId,
      eventPayload: message,
      requestPayload: payload,
    });

    this.logger.debug(
      `Dispatching webhook for subscription ${subscriptionId} to ${subscription.webhook.url}`,
    );

    const result = await this.webhookCallerService.callWithRetry(
      subscription.webhook.url,
      payloadString,
      headers,
      subscription.webhook.retryPolicy,
    );

    if (result.success) {
      await this.webhookLogRepository.markSuccess(
        logId,
        result.responseStatus!,
        result.responseBody || '',
        result.responseTimeMs,
        result.attemptCount,
      );
      this.logger.log(
        `Webhook delivered successfully for subscription ${subscriptionId}`,
      );
    } else {
      await this.webhookLogRepository.markFailed(
        logId,
        result.errorMessage || 'Unknown error',
        result.attemptCount,
        result.responseStatus,
        result.responseBody,
        result.responseTimeMs,
      );
      this.logger.error(
        `Webhook delivery failed for subscription ${subscriptionId}: ${result.errorMessage}`,
      );
    }
  }
}
