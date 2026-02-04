import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.createApplicationContext(AppModule);

  app.enableShutdownHooks();

  logger.log('Webhook Dispatcher is running (standalone mode)');
}

bootstrap();
