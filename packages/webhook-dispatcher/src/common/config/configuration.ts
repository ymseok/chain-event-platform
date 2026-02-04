export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  webhook: {
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10),
    concurrencyPerApp: parseInt(process.env.CONCURRENCY_PER_APP || '5', 10),
    brpopTimeoutSec: parseInt(process.env.BRPOP_TIMEOUT_SEC || '5', 10),
  },
});
