import { Module } from '@nestjs/common';
import { IngestorController } from './ingestor.controller';
import { IngestorService } from './ingestor.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IngestorController],
  providers: [IngestorService],
  exports: [IngestorService],
})
export class IngestorModule {}
