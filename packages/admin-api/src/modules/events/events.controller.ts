import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { EventResponseDto } from './dto/event-response.dto';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('programs/:programId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all events for a program' })
  @ApiResponse({ status: 200, description: 'List of events', type: [EventResponseDto] })
  async findAll(
    @Param('programId', ParseUUIDPipe) programId: string,
  ): Promise<EventResponseDto[]> {
    return this.eventsService.findAllByProgramId(programId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details', type: EventResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EventResponseDto> {
    return this.eventsService.findOne(id);
  }
}
