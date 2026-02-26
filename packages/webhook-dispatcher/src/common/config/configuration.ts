import { randomUUID } from 'crypto';

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  adminApi: {
    url: process.env.ADMIN_API_URL || 'http://localhost:3001/api/v1',
    internalApiKey: process.env.INTERNAL_API_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  webhook: {
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000', 10),
    concurrencyPerApp: parseInt(process.env.CONCURRENCY_PER_APP || '1', 10),
  },
  stream: {
    blockTimeoutMs: parseInt(process.env.STREAM_BLOCK_TIMEOUT_MS || '5000', 10),
    minIdleTimeMs: parseInt(process.env.STREAM_MIN_IDLE_MS || '120000', 10),
    pendingRecoveryIntervalMs: parseInt(
      process.env.STREAM_RECOVERY_INTERVAL_MS || '10000',
      10,
    ),
    maxRecoveryPerCycle: parseInt(
      process.env.STREAM_MAX_RECOVERY_PER_CYCLE || '100',
      10,
    ),
    maxDeliveryCount: parseInt(
      process.env.STREAM_MAX_DELIVERY_COUNT || '10',
      10,
    ),
    retentionMs: 86_400_000,
    dlqRetentionMs: 604_800_000,
    trimIntervalMs: 300_000,
    emergencyMaxLen: 1_000_000,
  },
  partitioning: {
    leaseTtlSec: parseInt(process.env.LEASE_TTL_SEC || '30', 10),
    claimIntervalMs: parseInt(process.env.CLAIM_INTERVAL_MS || '5000', 10),
    instanceId: process.env.INSTANCE_ID || `dispatcher-${randomUUID().slice(0, 8)}`,
  },
});
