import { Module } from '@nestjs/common';
import { AdminApiService } from './admin-api.service';
import { WebhookLogRepository } from './webhook-log.repository';
import { WebhookCallerService } from './webhook-caller.service';
import { DispatcherService } from './dispatcher.service';
import { QueueConsumerService } from './queue-consumer.service';
import { AppClaimService } from './app-claim.service';
import { StreamMaintenanceService } from './stream-maintenance.service';

@Module({
  providers: [
    AdminApiService,
    WebhookLogRepository,
    WebhookCallerService,
    DispatcherService,
    QueueConsumerService,
    AppClaimService,
    StreamMaintenanceService,
  ],
  exports: [DispatcherService],
})
export class DispatcherModule {}
