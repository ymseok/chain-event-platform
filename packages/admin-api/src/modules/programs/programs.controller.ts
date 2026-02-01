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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { ProgramResponseDto, ProgramDetailResponseDto } from './dto/program-response.dto';
import { CurrentUser } from '../../common/decorators';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@ApiTags('Programs')
@ApiBearerAuth()
@Controller()
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Post('applications/:appId/programs')
  @ApiOperation({ summary: 'Create a new program (smart contract)' })
  @ApiResponse({ status: 201, description: 'Program created', type: ProgramResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Body() createDto: CreateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.create(userId, applicationId, createDto);
  }

  @Get('applications/:appId/programs')
  @ApiOperation({ summary: 'Get all programs for an application' })
  @ApiResponse({ status: 200, description: 'List of programs' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Param('appId', ParseUUIDPipe) applicationId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProgramResponseDto>> {
    return this.programsService.findAllByApplicationId(userId, applicationId, pagination);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Get program details with events' })
  @ApiResponse({ status: 200, description: 'Program details', type: ProgramDetailResponseDto })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProgramDetailResponseDto> {
    return this.programsService.findOne(userId, id);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Update program' })
  @ApiResponse({ status: 200, description: 'Program updated', type: ProgramResponseDto })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProgramDto,
  ): Promise<ProgramResponseDto> {
    return this.programsService.update(userId, id, updateDto);
  }

  @Delete('programs/:id')
  @ApiOperation({ summary: 'Delete program' })
  @ApiResponse({ status: 200, description: 'Program deleted' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.programsService.remove(userId, id);
  }

  @Patch('programs/:id/status')
  @ApiOperation({ summary: 'Toggle program status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: ProgramResponseDto })
  async toggleStatus(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProgramResponseDto> {
    return this.programsService.toggleStatus(userId, id);
  }
}
