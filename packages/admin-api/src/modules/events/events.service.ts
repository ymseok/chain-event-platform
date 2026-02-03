import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { EventResponseDto } from './dto/event-response.dto';
import { ParsedEvent } from '../../common/utils/abi-parser.util';
import { EntityNotFoundException } from '../../common/exceptions';
import { PaginationQueryDto, PaginatedResponseDto } from '../../common/dto';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async createMany(programId: string, events: ParsedEvent[]): Promise<void> {
    await this.eventsRepository.createMany(
      events.map((e) => ({
        programId,
        name: e.name,
        signature: e.signature,
        parameters: e.parameters,
      })),
    );
  }

  async findAllByProgramId(programId: string): Promise<EventResponseDto[]> {
    const events = await this.eventsRepository.findAllByProgramId(programId);
    return events.map(EventResponseDto.fromEntity);
  }

  async findAllByProgramIdPaginated(
    programId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    const [events, total] = await this.eventsRepository.findAllByProgramIdPaginated(
      programId,
      pagination.skip,
      pagination.take,
    );
    return PaginatedResponseDto.create(events.map(EventResponseDto.fromEntity), {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total,
    });
  }

  async findOne(id: string): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new EntityNotFoundException('Event', id);
    }
    return EventResponseDto.fromEntity(event);
  }

  async syncEvents(
    programId: string,
    newEvents: ParsedEvent[],
  ): Promise<{ added: number; removed: number; preserved: number }> {
    const existingEvents = await this.eventsRepository.findAllByProgramId(programId);
    const existingSignatures = new Map(existingEvents.map((e) => [e.signature, e]));
    const newSignatures = new Set(newEvents.map((e) => e.signature));

    // Events to add (new signatures not in existing)
    const eventsToAdd = newEvents.filter((e) => !existingSignatures.has(e.signature));

    // Events to delete (existing signatures not in new)
    const eventsToDelete = existingEvents.filter((e) => !newSignatures.has(e.signature));

    if (eventsToDelete.length > 0) {
      await this.eventsRepository.deleteByIds(eventsToDelete.map((e) => e.id));
    }

    if (eventsToAdd.length > 0) {
      await this.createMany(programId, eventsToAdd);
    }

    return {
      added: eventsToAdd.length,
      removed: eventsToDelete.length,
      preserved: existingEvents.length - eventsToDelete.length,
    };
  }
}
