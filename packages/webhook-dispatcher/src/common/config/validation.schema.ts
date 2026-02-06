import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  WEBHOOK_TIMEOUT_MS: Joi.number().default(10000),
  CONCURRENCY_PER_APP: Joi.number().default(5),
  BRPOP_TIMEOUT_SEC: Joi.number().default(5),
  LEASE_TTL_SEC: Joi.number().min(10).default(30),
  CLAIM_INTERVAL_MS: Joi.number().min(1000).default(5000),
  INSTANCE_ID: Joi.string().optional(),
});
