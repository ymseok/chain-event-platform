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
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { ApplicationResponseDto } from './dto/application-response.dto';
import { CurrentUser } from '../../common/decorators';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  @ApiResponse({ status: 201, description: 'Application created', type: ApplicationResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications for current user' })
  @ApiResponse({ status: 200, description: 'List of applications' })
  async findAll(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ApplicationResponseDto>> {
    return this.applicationsService.findAllByUserId(user.id, user.isRoot, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({ status: 200, description: 'Application details', type: ApplicationResponseDto })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.findOne(user.id, id, user.isRoot);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application' })
  @ApiResponse({ status: 200, description: 'Application updated', type: ApplicationResponseDto })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApplicationDto,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.update(user.id, id, updateDto, user.isRoot);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete application' })
  @ApiResponse({ status: 200, description: 'Application deleted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async remove(
    @CurrentUser() user: { id: string; isRoot: boolean },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.applicationsService.remove(user.id, id, user.isRoot);
  }
}
