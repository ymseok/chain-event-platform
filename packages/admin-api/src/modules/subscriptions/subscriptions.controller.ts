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
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Body() createDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(userId, applicationId, createDto);
  }

  @Get('applications/:appId/subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions for an application' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<SubscriptionResponseDto>> {
    return this.subscriptionsService.findAllByApplicationId(userId, applicationId, pagination);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get subscription details' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(userId, id);
  }

  @Patch('subscriptions/:id')
  @ApiOperation({ summary: 'Update subscription' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.update(userId, id, updateDto);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Delete subscription' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.subscriptionsService.remove(userId, id);
  }

  @Patch('subscriptions/:id/status')
  @ApiOperation({ summary: 'Toggle subscription status' })
  async toggleStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.toggleStatus(userId, id);
  }
}
