import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { ProgramsRepository } from './programs.repository';
import { ApplicationsModule } from '../applications/applications.module';
import { ChainsModule } from '../chains/chains.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [ApplicationsModule, ChainsModule, EventsModule],
  controllers: [ProgramsController],
  providers: [ProgramsService, ProgramsRepository],
  exports: [ProgramsService],
})
export class ProgramsModule {}
