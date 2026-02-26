import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  ADMIN_API_URL: Joi.string().uri().required(),
  INTERNAL_API_KEY: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  WEBHOOK_TIMEOUT_MS: Joi.number().default(10000),
  CONCURRENCY_PER_APP: Joi.number().default(1),
  STREAM_BLOCK_TIMEOUT_MS: Joi.number().default(5000),
  STREAM_MIN_IDLE_MS: Joi.number().default(120000),
  STREAM_RECOVERY_INTERVAL_MS: Joi.number().default(10000),
  STREAM_MAX_RECOVERY_PER_CYCLE: Joi.number().default(100),
  STREAM_MAX_DELIVERY_COUNT: Joi.number().min(1).default(10),
  LEASE_TTL_SEC: Joi.number().min(10).default(30),
  CLAIM_INTERVAL_MS: Joi.number().min(1000).default(5000),
  INSTANCE_ID: Joi.string().optional(),
});
