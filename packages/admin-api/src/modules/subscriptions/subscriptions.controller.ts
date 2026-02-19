import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CurrentUser } from '../../common/decorators';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('applications/:appId/subscriptions')
  @ApiOperation({ summary: 'Create an event subscription' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  async create(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Body() createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(user.id, applicationId, createDto, user.isRoot);
  }

  @Get('applications/:appId/subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions for an application' })
  async findAll(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SubscriptionResponseDto>> {
    return this.subscriptionsService.findAllByApplicationId(user.id, applicationId, pagination, user.isRoot);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get subscription details' })
  async findOne(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(user.id, id, user.isRoot);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Update subscription' })
  async update(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.update(user.id, id, updateDto, user.isRoot);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Delete subscription' })
  async remove(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.subscriptionsService.remove(user.id, id, user.isRoot);
  }

  @Patch('subscriptions/:id/status')
  @ApiOperation({ summary: 'Toggle subscription status' })
  async toggleStatus(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.toggleStatus(user.id, id, user.isRoot);
  }
}
