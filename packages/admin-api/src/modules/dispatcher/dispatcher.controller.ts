import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DispatcherService } from './dispatcher.service';
import {
  DispatcherInstancesResponseDto,
  DispatcherRebalanceResponseDto,
  DispatcherApplicationDto,
  DispatcherSubscriptionResponseDto,
} from './dto';
import { InternalOnly, RootOnly } from '../../common/decorators';

@SkipThrottle()
@ApiTags('Dispatcher')
@Controller('dispatcher')
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Get('applications/active')
  @InternalOnly()
  @ApiOperation({
    summary: 'Get all active applications for dispatcher',
    description:
      'Returns all applications. Internal endpoint for webhook-dispatcher.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active applications',
    type: [DispatcherApplicationDto],
  })
  async getActiveApplications(): Promise<DispatcherApplicationDto[]> {
    return this.dispatcherService.getActiveApplications();
  }

  @Get('applications/:id')
  @InternalOnly()
  @ApiOperation({
    summary: 'Get application by ID',
    description:
      'Returns a single application by ID. Internal endpoint for webhook-dispatcher.',
  })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'Application data',
    type: DispatcherApplicationDto,
  })
  async getApplicationById(
    @Param('id') id: string,
  ): Promise<DispatcherApplicationDto> {
    const app = await this.dispatcherService.getApplicationById(id);
    if (!app) throw new NotFoundException(`Application not found: ${id}`);
    return app;
  }

  @Get('subscriptions/:id')
  @InternalOnly()
  @ApiOperation({
    summary: 'Get subscription by ID with webhook details',
    description:
      'Returns subscription with event and webhook info. Internal endpoint for webhook-dispatcher.',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription with webhook data',
    type: DispatcherSubscriptionResponseDto,
  })
  async getSubscriptionById(
    @Param('id') id: string,
  ): Promise<DispatcherSubscriptionResponseDto> {
    const subscription = await this.dispatcherService.getSubscriptionById(id);
    if (!subscription)
      throw new NotFoundException(`Subscription not found: ${id}`);
    return subscription;
  }

  @Get('instances')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active dispatcher instances',
    description:
      'Returns all dispatcher instances with their claimed applications and unclaimed apps',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispatcher instances data',
    type: DispatcherInstancesResponseDto,
  })
  async getInstances(): Promise<DispatcherInstancesResponseDto> {
    return this.dispatcherService.getInstances();
  }

  @Post('rebalance')
  @RootOnly()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger dispatcher rebalancing',
    description:
      'Releases excess claims from over-loaded instances so under-loaded instances can pick them up',
  })
  @ApiResponse({
    status: 200,
    description: 'Rebalance result',
    type: DispatcherRebalanceResponseDto,
  })
  async rebalance(): Promise<DispatcherRebalanceResponseDto> {
    return this.dispatcherService.rebalance();
  }
}
