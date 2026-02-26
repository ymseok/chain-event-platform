import { Injectable, Logger } from '@nestjs/common';
import { EventQueueMessage } from '../../common/interfaces';
import {
  AdminApiService,
  SubscriptionWithWebhook,
} from './admin-api.service';
import { WebhookLogRepository } from './webhook-log.repository';
import { WebhookCallerService } from './webhook-caller.service';

export type DispatchResult = 'success' | 'non_retryable' | 'retryable_failure';

interface CachedSubscription {
  data: SubscriptionWithWebhook;
  cachedAt: number;
  stale: boolean;
}

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);
  private subscriptionCache = new Map<string, CachedSubscription>();
  private readonly cacheTtlMs = 300_000; // 5 min safety-net TTL
  private pendingRefreshes = new Set<string>(); // prevent duplicate revalidations

  constructor(
    private adminApiService: AdminApiService,
    private webhookLogRepository: WebhookLogRepository,
    private webhookCallerService: WebhookCallerService,
  ) {}

  /**
   * Mark all subscription cache entries as stale (soft invalidation).
   * Stale entries are still served immediately but revalidated in the background.
   */
  invalidateCache(): void {
    let count = 0;
    for (const [, entry] of this.subscriptionCache) {
      if (!entry.stale) {
        entry.stale = true;
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`Marked ${count} subscription cache entries as stale`);
    }
  }

  async dispatch(message: EventQueueMessage): Promise<DispatchResult> {
    const { subscriptionId } = message;

    let subscription: SubscriptionWithWebhook | undefined;
    const cached = this.subscriptionCache.get(subscriptionId);

    if (cached) {
      const isExpired = Date.now() - cached.cachedAt > this.cacheTtlMs;

      if (!cached.stale && !isExpired) {
        // Fresh cache hit
        subscription = cached.data;
      } else {
        // Stale or TTL-expired — return existing data, revalidate in background
        subscription = cached.data;
        this.revalidateInBackground(subscriptionId);
      }
    } else {
      // Cache miss — synchronous fetch (unavoidable on first access)
      const fetched = await this.adminApiService.getSubscriptionById(subscriptionId);
      if (fetched) {
        this.subscriptionCache.set(subscriptionId, {
          data: fetched,
          cachedAt: Date.now(),
          stale: false,
        });
        subscription = fetched;
      }
    }

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return 'non_retryable';
    }

    if (subscription.status !== 'ACTIVE') {
      this.logger.debug(
        `Subscription is not active: ${subscriptionId} (${subscription.status})`,
      );
      return 'non_retryable';
    }

    if (subscription.webhook.status !== 'ACTIVE') {
      this.logger.debug(
        `Webhook is not active: ${subscription.webhookId} (${subscription.webhook.status})`,
      );
      return 'non_retryable';
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
      return 'success';
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
      return 'retryable_failure';
    }
  }

  private revalidateInBackground(subscriptionId: string): void {
    if (this.pendingRefreshes.has(subscriptionId)) return;
    this.pendingRefreshes.add(subscriptionId);

    this.adminApiService
      .getSubscriptionById(subscriptionId)
      .then((fetched) => {
        if (fetched) {
          this.subscriptionCache.set(subscriptionId, {
            data: fetched,
            cachedAt: Date.now(),
            stale: false,
          });
        } else {
          this.subscriptionCache.delete(subscriptionId);
        }
      })
      .catch((error) => {
        this.logger.warn(
          `Background revalidation failed for ${subscriptionId}: ${error.message}`,
        );
        // Keep stale data on failure — next access will retry
      })
      .finally(() => {
        this.pendingRefreshes.delete(subscriptionId);
      });
  }
}
