import { Controller, Get, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DispatcherService } from './dispatcher.service';
import {
  DispatcherInstancesResponseDto,
  DispatcherRebalanceResponseDto,
} from './dto';
import { RootOnly } from '../../common/decorators';

@ApiTags('Dispatcher')
@ApiBearerAuth()
@Controller('dispatcher')
export class DispatcherController {
  constructor(private readonly dispatcherService: DispatcherService) {}

  @Get('instances')
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
