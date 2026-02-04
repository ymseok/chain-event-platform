import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { ChainsModule } from './modules/chains/chains.module';
import { ChainSyncStatusModule } from './modules/chain-sync-status/chain-sync-status.module';
import { IngestorModule } from './modules/ingestor/ingestor.module';
import { RedisModule } from './redis/redis.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { EventsModule } from './modules/events/events.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { WebhookLogsModule } from './modules/webhook-logs/webhook-logs.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './common/config/configuration';
import { validationSchema } from './common/config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    ApiKeysModule,
    ChainsModule,
    ChainSyncStatusModule,
    ProgramsModule,
    EventsModule,
    WebhooksModule,
    SubscriptionsModule,
    WebhookLogsModule,
    StatisticsModule,
    DashboardModule,
    HealthModule,
    IngestorModule,
  ],
})
export class AppModule {}
