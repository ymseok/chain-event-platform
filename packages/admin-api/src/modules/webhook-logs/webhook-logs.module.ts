import { Module } from '@nestjs/common';
import { WebhookLogsController } from './webhook-logs.controller';
import { WebhookLogsService } from './webhook-logs.service';
import { WebhookLogsRepository } from './webhook-logs.repository';

@Module({
  controllers: [WebhookLogsController],
  providers: [WebhookLogsService, WebhookLogsRepository],
  exports: [WebhookLogsService],
})
export class WebhookLogsModule {}
