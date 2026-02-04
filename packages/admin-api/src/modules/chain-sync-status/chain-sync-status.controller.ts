import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChainSyncStatusService } from './chain-sync-status.service';
import { UpdateChainSyncStatusDto, ChainSyncStatusResponseDto } from './dto';
import { Public } from '../../common/decorators';

@ApiTags('Chain Sync Status')
@Controller('chain-sync-status')
export class ChainSyncStatusController {
  constructor(private readonly chainSyncStatusService: ChainSyncStatusService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all chain sync statuses' })
  @ApiResponse({
    status: 200,
    description: 'List of all chain sync statuses',
    type: [ChainSyncStatusResponseDto],
  })
  async findAll(): Promise<ChainSyncStatusResponseDto[]> {
    return this.chainSyncStatusService.findAll();
  }

  @Get(':chainId')
  @Public()
  @ApiOperation({ summary: 'Get sync status for a specific chain' })
  @ApiParam({ name: 'chainId', description: 'Chain ID' })
  @ApiResponse({
    status: 200,
    description: 'Chain sync status',
    type: ChainSyncStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Sync status not found' })
  async findByChainId(
    @Param('chainId', ParseIntPipe) chainId: number,
  ): Promise<ChainSyncStatusResponseDto> {
    return this.chainSyncStatusService.findByChainId(chainId);
  }

  @Put(':chainId')
  @Public()
  @ApiOperation({ summary: 'Create or update sync status for a chain' })
  @ApiParam({ name: 'chainId', description: 'Chain ID' })
  @ApiResponse({
    status: 200,
    description: 'Sync status updated',
    type: ChainSyncStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Chain not found' })
  async upsert(
    @Param('chainId', ParseIntPipe) chainId: number,
    @Body() dto: UpdateChainSyncStatusDto,
  ): Promise<ChainSyncStatusResponseDto> {
    return this.chainSyncStatusService.upsert(chainId, dto);
  }

  @Delete(':chainId')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sync status for a chain' })
  @ApiParam({ name: 'chainId', description: 'Chain ID' })
  @ApiResponse({ status: 204, description: 'Sync status deleted' })
  @ApiResponse({ status: 404, description: 'Sync status not found' })
  async delete(@Param('chainId', ParseIntPipe) chainId: number): Promise<void> {
    return this.chainSyncStatusService.delete(chainId);
  }
}
