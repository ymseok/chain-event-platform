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
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { WebhookResponseDto, WebhookTestResultDto } from './dto/webhook-response.dto';
import { CurrentUser } from '../../common/decorators';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('applications/:appId/webhooks')
  @ApiOperation({ summary: 'Create a new webhook' })
  @ApiResponse({ status: 201, type: WebhookResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Body() createDto: CreateWebhookDto,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.create(userId, applicationId, createDto);
  }

  @Get('applications/:appId/webhooks')
  @ApiOperation({ summary: 'Get all webhooks for an application' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<WebhookResponseDto>> {
    return this.webhooksService.findAllByApplicationId(userId, applicationId, pagination);
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: 'Get webhook details' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.findOne(userId, id);
  }

  @Patch('webhooks/:id')
  @ApiOperation({ summary: 'Update webhook' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWebhookDto,
  ): Promise<WebhookResponseDto> {
    return this.webhooksService.update(userId, id, updateDto);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete webhook' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.webhooksService.remove(userId, id);
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: 'Test webhook connection' })
  @ApiResponse({ status: 200, type: WebhookTestResultDto })
  async test(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WebhookTestResultDto> {
    return this.webhooksService.test(userId, id);
  }
}
