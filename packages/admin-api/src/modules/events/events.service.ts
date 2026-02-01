import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository';
import { EventResponseDto } from './dto/event-response.dto';
import { ParsedEvent } from '../../common/utils/abi-parser.util';
import { EntityNotFoundException } from '../../common/exceptions';

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async createMany(programId: string, events: ParsedEvent[]): Promise<void> {
    await this.eventsRepository.createMany(
      events.map((e) => ({
        programId,
        name: e.name,
        signature: e.signature,
        parameters: e.parameters as unknown as object,
      })),
    );
  }

  async findAllByProgramId(programId: string): Promise<EventResponseDto[]> {
    const events = await this.eventsRepository.findAllByProgramId(programId);
    return events.map(EventResponseDto.fromEntity);
  }

  async findOne(id: string): Promise<EventResponseDto> {
    const event = await this.eventsRepository.findById(id);
    if (!event) {
      throw new EntityNotFoundException('Event', id);
    }
    return EventResponseDto.fromEntity(event);
  }
}
