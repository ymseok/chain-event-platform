import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { CryptoUtil } from '../../common/utils/crypto.util';
import {
  WebhookPayload,
  WebhookHeaders,
  EventQueueMessage,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from '../../common/interfaces';
import { SubscriptionWithWebhook } from './subscription.repository';

export interface WebhookCallResult {
  success: boolean;
  responseStatus?: number;
  responseBody?: string;
  responseTimeMs: number;
  errorMessage?: string;
  attemptCount: number;
}

@Injectable()
export class WebhookCallerService {
  private readonly logger = new Logger(WebhookCallerService.name);
  private readonly timeoutMs: number;

  constructor(private configService: ConfigService) {
    this.timeoutMs = this.configService.get<number>('webhook.timeoutMs', 10000);
  }

  buildPayload(
    message: EventQueueMessage,
    subscription: SubscriptionWithWebhook,
  ): WebhookPayload {
    return {
      id: uuidv4(),
      timestamp: Date.now(),
      subscriptionId: subscription.id,
      event: {
        name: subscription.event.name,
        topic: message.eventTopic,
        data: message.data,
      },
      metadata: {
        blockNumber: message.metadata.blockNumber,
        transactionHash: message.metadata.transactionHash,
        logIndex: message.metadata.logIndex,
        chainId: message.metadata.chainId,
        contractAddress: message.metadata.contractAddress,
        blockTimestamp: message.metadata.timestamp,
      },
    };
  }

  buildHeaders(
    payload: WebhookPayload,
    secret: string,
    customHeaders?: Record<string, string> | null,
  ): WebhookHeaders {
    const payloadString = JSON.stringify(payload);
    const signature = CryptoUtil.generateHmacSignature(payloadString, secret);

    const headers: WebhookHeaders = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Timestamp': payload.timestamp.toString(),
      'X-Webhook-Signature': `sha256=${signature}`,
    };

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  async callWithRetry(
    url: string,
    payload: WebhookPayload,
    headers: WebhookHeaders,
    retryPolicy?: RetryPolicy,
  ): Promise<WebhookCallResult> {
    const policy = retryPolicy || DEFAULT_RETRY_POLICY;
    let lastError: string | undefined;
    let lastResponseStatus: number | undefined;
    let lastResponseBody: string | undefined;
    let totalResponseTimeMs = 0;

    for (let attempt = 1; attempt <= policy.maxRetries + 1; attempt++) {
      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.timeoutMs,
        );

        const response = await fetch(url, {
          method: 'POST',
          headers: headers as Record<string, string>,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseTimeMs = Date.now() - startTime;
        totalResponseTimeMs += responseTimeMs;

        const responseBody = await response.text();
        lastResponseStatus = response.status;
        lastResponseBody = responseBody.substring(0, 10000);

        if (response.ok) {
          this.logger.debug(
            `Webhook call succeeded on attempt ${attempt}: ${url}`,
          );
          return {
            success: true,
            responseStatus: response.status,
            responseBody: lastResponseBody,
            responseTimeMs: totalResponseTimeMs,
            attemptCount: attempt,
          };
        }

        lastError = `HTTP ${response.status}: ${lastResponseBody}`;
        this.logger.warn(
          `Webhook call failed on attempt ${attempt}/${policy.maxRetries + 1}: ${lastError}`,
        );
      } catch (error) {
        const responseTimeMs = Date.now() - startTime;
        totalResponseTimeMs += responseTimeMs;

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            lastError = `Request timeout after ${this.timeoutMs}ms`;
          } else {
            lastError = error.message;
          }
        } else {
          lastError = 'Unknown error';
        }

        this.logger.warn(
          `Webhook call error on attempt ${attempt}/${policy.maxRetries + 1}: ${lastError}`,
        );
      }

      if (attempt <= policy.maxRetries) {
        const delay =
          policy.retryInterval * Math.pow(policy.backoffMultiplier, attempt - 1);
        this.logger.debug(`Waiting ${delay}ms before retry`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      responseStatus: lastResponseStatus,
      responseBody: lastResponseBody,
      responseTimeMs: totalResponseTimeMs,
      errorMessage: lastError,
      attemptCount: policy.maxRetries + 1,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
