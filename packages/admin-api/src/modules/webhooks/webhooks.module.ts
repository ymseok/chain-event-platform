import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhooksRepository } from './webhooks.repository';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [HttpModule, ApplicationsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksRepository],
  exports: [WebhooksService],
})
export class WebhooksModule {}
