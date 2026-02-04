export interface Config {
  adminApi: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
  };
  polling: {
    intervalMs: number;
    statusReportIntervalMs: number;
  };
  logging: {
    level: string;
  };
}

export function loadConfig(): Config {
  return {
    adminApi: {
      url: process.env.ADMIN_API_URL || 'http://localhost:3001/api/v1',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    polling: {
      intervalMs: parseInt(process.env.POLL_INTERVAL_MS || '1000', 10),
      statusReportIntervalMs: parseInt(
        process.env.STATUS_REPORT_INTERVAL_MS || '30000',
        10,
      ),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
  };
}
