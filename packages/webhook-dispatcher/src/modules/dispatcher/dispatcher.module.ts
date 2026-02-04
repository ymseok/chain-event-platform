import { Module } from '@nestjs/common';
import { SubscriptionRepository } from './subscription.repository';
import { ApplicationRepository } from './application.repository';
import { WebhookLogRepository } from './webhook-log.repository';
import { WebhookCallerService } from './webhook-caller.service';
import { DispatcherService } from './dispatcher.service';
import { QueueConsumerService } from './queue-consumer.service';

@Module({
  providers: [
    SubscriptionRepository,
    ApplicationRepository,
    WebhookLogRepository,
    WebhookCallerService,
    DispatcherService,
    QueueConsumerService,
  ],
  exports: [DispatcherService],
})
export class DispatcherModule {}
