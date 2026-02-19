import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChainsService } from './chains.service';
import {
  ChainResponseDto,
  ChainAdminResponseDto,
  RpcCheckResultDto,
  CreateChainDto,
  UpdateChainDto,
} from './dto';
import { RootOnly } from '../../common/decorators';

@ApiTags('Chains')
@ApiBearerAuth()
@Controller('chains')
export class ChainsController {
  constructor(private readonly chainsService: ChainsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active blockchain networks' })
  @ApiResponse({ status: 200, description: 'List of active chains', type: [ChainResponseDto] })
  async findAll(): Promise<ChainResponseDto[]> {
    return this.chainsService.findAll();
  }

  @Get('admin')
  @ApiOperation({ summary: 'Get all blockchain networks (admin - includes INACTIVE)' })
  @ApiResponse({ status: 200, description: 'List of all chains', type: [ChainAdminResponseDto] })
  async findAllAdmin(): Promise<ChainAdminResponseDto[]> {
    return this.chainsService.findAllAdmin();
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Get blockchain network by ID (admin - full details)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Chain details', type: ChainAdminResponseDto })
  @ApiResponse({ status: 404, description: 'Chain not found' })
  async findByIdAdmin(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ChainAdminResponseDto> {
    return this.chainsService.findByIdAdmin(id);
  }

  @Post()
  @RootOnly()
  @ApiOperation({ summary: 'Create a new blockchain network' })
  @ApiResponse({ status: 201, description: 'Chain created', type: ChainAdminResponseDto })
  @ApiResponse({ status: 409, description: 'Chain with same name or chainId already exists' })
  async create(@Body() dto: CreateChainDto): Promise<ChainAdminResponseDto> {
    return this.chainsService.create(dto);
  }

  @Patch(':id')
  @RootOnly()
  @ApiOperation({ summary: 'Update a blockchain network' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Chain updated', type: ChainAdminResponseDto })
  @ApiResponse({ status: 404, description: 'Chain not found' })
  @ApiResponse({ status: 409, description: 'Chain with same name or chainId already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChainDto,
  ): Promise<ChainAdminResponseDto> {
    return this.chainsService.update(id, dto);
  }

  @Delete(':id')
  @RootOnly()
  @ApiOperation({ summary: 'Delete a blockchain network' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Chain deleted' })
  @ApiResponse({ status: 404, description: 'Chain not found' })
  @ApiResponse({ status: 400, description: 'Chain has associated programs' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.chainsService.remove(id);
  }

  @Post(':id/check-rpc')
  @RootOnly()
  @ApiOperation({ summary: 'Check RPC connection for a blockchain network' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'RPC check result', type: RpcCheckResultDto })
  @ApiResponse({ status: 404, description: 'Chain not found' })
  async checkRpcConnection(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RpcCheckResultDto> {
    return this.chainsService.checkRpcConnection(id);
  }
}
