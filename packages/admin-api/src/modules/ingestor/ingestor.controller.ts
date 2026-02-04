import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IngestorService } from './ingestor.service';
import {
  IngestorSubscriptionsResponseDto,
  IngestorSubscriptionDto,
} from './dto';
import { Public } from '../../common/decorators';
import { RedisPublisherService } from '../../redis';

@ApiTags('Ingestor')
@Controller('ingestor')
export class IngestorController {
  constructor(
    private readonly ingestorService: IngestorService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  @Get('subscriptions')
  @Public()
  @ApiOperation({
    summary: 'Get all active chains and subscriptions for ingestor',
    description:
      'Returns all active chains and subscriptions with full event/webhook info for blockchain-event-ingestor consumption',
  })
  @ApiResponse({
    status: 200,
    description: 'Chains and subscriptions data',
    type: IngestorSubscriptionsResponseDto,
  })
  async getSubscriptions(): Promise<IngestorSubscriptionsResponseDto> {
    return this.ingestorService.getSubscriptions();
  }

  @Get('subscriptions/chain/:chainId')
  @Public()
  @ApiOperation({
    summary: 'Get subscriptions for a specific chain',
    description: 'Returns all active subscriptions for a specific chain',
  })
  @ApiParam({ name: 'chainId', description: 'Chain ID (internal)' })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions for the chain',
    type: [IngestorSubscriptionDto],
  })
  async getSubscriptionsByChainId(
    @Param('chainId', ParseIntPipe) chainId: number,
  ): Promise<IngestorSubscriptionDto[]> {
    return this.ingestorService.getSubscriptionsByChainId(chainId);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger full refresh signal',
    description:
      'Publishes FULL_REFRESH signal to Redis channel to notify blockchain-event-ingestor to reload all configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh signal published successfully',
  })
  async triggerRefresh(): Promise<{ message: string }> {
    await this.redisPublisher.publishFullRefresh();
    return { message: 'Refresh signal published successfully' };
  }
}
