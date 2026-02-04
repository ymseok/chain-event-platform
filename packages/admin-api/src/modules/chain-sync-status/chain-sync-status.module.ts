import { Module } from '@nestjs/common';
import { ChainSyncStatusController } from './chain-sync-status.controller';
import { ChainSyncStatusService } from './chain-sync-status.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ChainSyncStatusController],
  providers: [ChainSyncStatusService],
  exports: [ChainSyncStatusService],
})
export class ChainSyncStatusModule {}
