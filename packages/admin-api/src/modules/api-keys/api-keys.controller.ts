import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto/api-key-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post('applications/:appId/api-keys')
  @ApiOperation({ summary: 'Generate a new API key for an application' })
  @ApiResponse({ status: 201, description: 'API key created', type: ApiKeyCreatedResponseDto })
  async create(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Body() createDto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeysService.create(user.id, applicationId, createDto, user.isRoot);
  }

  @Get('applications/:appId/api-keys')
  @ApiOperation({ summary: 'Get all API keys for an application' })
  @ApiResponse({ status: 200, description: 'List of API keys', type: [ApiKeyResponseDto] })
  async findAll(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ApiKeyResponseDto>> {
    return this.apiKeysService.findAllByApplicationId(user.id, applicationId, paginationQuery, user.isRoot);
  }

  @Patch('api-keys/:id/revoke')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revoke(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.apiKeysService.revoke(user.id, id, user.isRoot);
  }
}
