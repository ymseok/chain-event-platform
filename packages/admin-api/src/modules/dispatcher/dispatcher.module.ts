import { Module } from '@nestjs/common';
import { DispatcherController } from './dispatcher.controller';
import { DispatcherService } from './dispatcher.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DispatcherController],
  providers: [DispatcherService],
  exports: [DispatcherService],
})
export class DispatcherModule {}
