import 'dotenv/config';
import { loadConfig } from './config';
import { ChainManagerService } from './services/chain-manager.service';
import { ConfigSubscriberService } from './services/config-subscriber.service';
import { mainLogger as logger } from './services/logger.service';

async function main(): Promise<void> {
  logger.info('Starting Blockchain Event Ingestor...');

  const config = loadConfig();
  logger.info('Configuration loaded', {
    adminApiUrl: config.adminApi.url,
    redisHost: config.redis.host,
    redisPort: config.redis.port,
  });

  // Create services
  const chainManager = new ChainManagerService(config);
  const configSubscriber = new ConfigSubscriberService(config);

  // Register refresh handler
  configSubscriber.onRefresh(async (type) => {
    await chainManager.handleRefresh(type);
  });

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    try {
      await configSubscriber.stop();
      await chainManager.shutdown();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    // Initialize chain manager (fetches initial data from admin-api)
    await chainManager.initialize();

    // Start listening for config refresh signals
    await configSubscriber.start();

    logger.info('Blockchain Event Ingestor is running');
  } catch (error) {
    logger.error('Failed to start Blockchain Event Ingestor', { error });
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});
