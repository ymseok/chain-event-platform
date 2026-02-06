import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { IngestorService } from './ingestor.service';
import {
  IngestorSubscriptionsResponseDto,
  IngestorSubscriptionDto,
} from './dto';
import { Public } from '../../common/decorators';

@ApiTags('Ingestor')
@Controller('ingestor')
export class IngestorController {
  constructor(private readonly ingestorService: IngestorService) {}

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
}
