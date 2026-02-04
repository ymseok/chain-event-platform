import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisPublisherService } from './redis-publisher.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);

        return new Redis({
          host,
          port,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) {
              return null; // Stop retrying
            }
            return Math.min(times * 100, 3000);
          },
        });
      },
      inject: [ConfigService],
    },
    RedisPublisherService,
  ],
  exports: [REDIS_CLIENT, RedisPublisherService],
})
export class RedisModule {}
