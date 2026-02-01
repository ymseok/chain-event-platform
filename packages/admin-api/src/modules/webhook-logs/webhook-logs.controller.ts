import { Controller, Get, Post, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebhookLogsService } from './webhook-logs.service';
import { WebhookLogQueryDto } from './dto/webhook-log-query.dto';
import { WebhookLogResponseDto } from './dto/webhook-log-response.dto';
import { CurrentUser } from '../../common/decorators';
import { PaginatedResponseDto } from '../../common/dto';

@ApiTags('Webhook Logs')
@ApiBearerAuth()
@Controller()
export class WebhookLogsController {
  constructor(private readonly webhookLogsService: WebhookLogsService) {}

  @Get('webhooks/:webhookId/logs')
  @ApiOperation({ summary: 'Get logs for a webhook' })
  async findByWebhook(
    @Param('webhookId', ParseUUIDPipe) webhookId: string,
    @Query() query: WebhookLogQueryDto,
  ): Promise<PaginatedResponseDto<WebhookLogResponseDto>> {
    return this.webhookLogsService.findByWebhookId(webhookId, query);
  }

  @Get('subscriptions/:subscriptionId/logs')
  @ApiOperation({ summary: 'Get logs for a subscription' })
  async findBySubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Query() query: WebhookLogQueryDto,
  ): Promise<PaginatedResponseDto<WebhookLogResponseDto>> {
    return this.webhookLogsService.findBySubscriptionId(subscriptionId, query);
  }

  @Post('webhook-logs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed webhook delivery' })
  @ApiResponse({ status: 200, description: 'Retry initiated' })
  async retry(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.webhookLogsService.retry(id);
  }
}
