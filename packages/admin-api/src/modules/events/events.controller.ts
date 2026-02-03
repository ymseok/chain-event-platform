import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('programs/:programId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events for a program' })
  @ApiResponse({ status: 200, description: 'List of events' })
  async findAll(
    @Param('programId', ParseUUIDPipe) programId: string,
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    return this.eventsService.findAllByProgramIdPaginated(programId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EventResponseDto> {
    return this.eventsService.findOne(id);
  }
}
