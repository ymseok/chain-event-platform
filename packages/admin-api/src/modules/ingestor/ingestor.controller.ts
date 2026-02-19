import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IngestorService } from './ingestor.service';
import {
  IngestorSubscriptionsResponseDto,
  IngestorSubscriptionDto,
  IngestorInstancesResponseDto,
  RebalanceResponseDto,
} from './dto';
import { Public, RootOnly } from '../../common/decorators';

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

  @Get('instances')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active ingestor instances',
    description:
      'Returns all ingestor instances with their claimed applications and unclaimed apps',
  })
  @ApiResponse({
    status: 200,
    description: 'Ingestor instances data',
    type: IngestorInstancesResponseDto,
  })
  async getInstances(): Promise<IngestorInstancesResponseDto> {
    return this.ingestorService.getInstances();
  }

  @Post('rebalance')
  @RootOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger ingestor rebalancing',
    description:
      'Releases excess claims from over-loaded instances so under-loaded instances can pick them up',
  })
  @ApiResponse({
    status: 200,
    description: 'Rebalance result',
    type: RebalanceResponseDto,
  })
  async rebalance(): Promise<RebalanceResponseDto> {
    return this.ingestorService.rebalance();
  }
}
