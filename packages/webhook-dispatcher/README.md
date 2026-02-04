# Webhook Dispatcher

A service that delivers detected blockchain events to registered webhook endpoints.

## Overview

The Webhook Dispatcher is responsible for:

- **Event Consumption**: Consumes detected events from Redis queue
- **Webhook Delivery**: HTTP POST requests to registered endpoints
- **Retry Logic**: Handles failed deliveries with configurable retries
- **Delivery Logging**: Records delivery attempts and outcomes

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **ORM**: Prisma 5 (shared schema with admin-api)
- **Queue**: Redis 7 (ioredis)
- **Validation**: Joi

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Webhook Dispatcher                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │    Redis     │────▶│  Dispatcher  │────▶│   HTTP       │       │
│   │    Queue     │     │   Service    │     │   Client     │       │
│   └──────────────┘     └──────────────┘     └──────────────┘       │
│                               │                     │                │
│                               │                     │                │
│                               ▼                     ▼                │
│                        ┌──────────────┐     ┌──────────────┐       │
│                        │  PostgreSQL  │     │  Subscriber  │       │
│                        │   (Logs)     │     │  Endpoints   │       │
│                        └──────────────┘     └──────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── common/
│   ├── config/            # Configuration validation
│   ├── constants/         # Application constants
│   ├── interfaces/        # TypeScript interfaces
│   └── utils/             # Utility functions
├── database/
│   └── prisma.service.ts  # Prisma client service
├── redis/
│   └── redis.service.ts   # Redis client service
├── modules/
│   └── dispatcher/
│       ├── dispatcher.module.ts
│       ├── dispatcher.service.ts
│       ├── dispatcher.processor.ts
│       └── dto/
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL 16 running
- Redis 7 running

### Installation

```bash
# From repository root
pnpm install

# Or from this package directory
cd packages/webhook-dispatcher
pnpm install
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port (for health checks) | `3004` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `WEBHOOK_TIMEOUT_MS` | HTTP request timeout | `5000` |
| `WEBHOOK_RETRY_ATTEMPTS` | Max retry attempts | `3` |
| `WEBHOOK_RETRY_DELAY_MS` | Delay between retries | `1000` |

### Database Setup

The dispatcher shares the Prisma schema with admin-api:

```bash
# Generate Prisma client
pnpm prisma:generate
```

### Running the Application

```bash
# Development mode with hot reload
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod

# Debug mode
pnpm start:debug
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build the application |
| `pnpm start` | Start in production mode |
| `pnpm start:dev` | Start in development mode with watch |
| `pnpm start:debug` | Start in debug mode |
| `pnpm start:prod` | Start compiled application |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm prisma:generate` | Generate Prisma client |

## How It Works

### Event Processing Flow

1. **Queue Consumption**
   - Listen to Redis queue for detected events
   - Deserialize event payload

2. **Webhook Lookup**
   - Find matching subscription
   - Retrieve webhook configuration (URL, headers)

3. **HTTP Delivery**
   - Build HTTP request with event payload
   - Include configured headers (e.g., API keys)
   - Send POST request to webhook URL

4. **Result Handling**
   - Log delivery attempt (success/failure)
   - Schedule retry if needed
   - Update delivery statistics

### Event Payload Structure

```typescript
interface WebhookPayload {
  id: string;
  timestamp: string;
  chainId: number;
  blockNumber: number;
  transactionHash: string;
  contractAddress: string;
  eventName: string;
  eventSignature: string;
  args: Record<string, any>;
  subscription: {
    id: string;
    name: string;
  };
}
```

### HTTP Request Format

```http
POST /webhook/endpoint HTTP/1.1
Host: subscriber.example.com
Content-Type: application/json
X-Webhook-ID: abc123
X-API-Key: configured-api-key

{
  "id": "evt_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "chainId": 31337,
  "blockNumber": 12345,
  "transactionHash": "0x...",
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "eventName": "Transfer",
  "args": {
    "from": "0x...",
    "to": "0x...",
    "value": "1000000000000000000"
  }
}
```

## Retry Strategy

Failed webhook deliveries are retried with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1st retry | 1 second |
| 2nd retry | 2 seconds |
| 3rd retry | 4 seconds |

After max retries, the event is marked as failed and logged.

## Error Handling

- **Network Errors**: Connection timeouts, DNS failures
- **HTTP Errors**: 4xx client errors, 5xx server errors
- **Timeout Errors**: Request exceeds configured timeout

### HTTP Status Handling

| Status | Action |
|--------|--------|
| 2xx | Success, mark delivered |
| 4xx | Client error, log and fail (no retry) |
| 5xx | Server error, retry |
| Timeout | Network issue, retry |

## Delivery Logging

All delivery attempts are logged to PostgreSQL:

```sql
WebhookLog {
  id
  webhookId
  subscriptionId
  eventId
  status       -- 'pending', 'delivered', 'failed'
  statusCode   -- HTTP status code
  responseTime -- Delivery duration (ms)
  error        -- Error message if failed
  attempts     -- Number of attempts
  createdAt
  updatedAt
}
```

## Monitoring

### Metrics

- Delivery success rate
- Average response time
- Queue depth
- Retry rate

### Health Check

Health endpoint available at:
```
GET http://localhost:3004/health
```

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Watch mode
pnpm test:watch
```

## Development

### Testing with Demo Webhook

1. Start demo-webhook server:
   ```bash
   pnpm dev:demo-webhook
   ```

2. Configure webhook in Admin UI pointing to:
   ```
   http://localhost:3003/api/webhook
   ```

3. Generate events and observe delivery in demo-webhook dashboard

## Related Components

- [admin-api](../admin-api) - Configuration and webhook registry
- [blockchain-event-ingestor](../blockchain-event-ingestor) - Block reader service
- [demo-webhook](../demo-webhook) - Test webhook receiver
