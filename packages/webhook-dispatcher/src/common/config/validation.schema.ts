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
});
