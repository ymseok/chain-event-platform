# Admin API

Backend REST API for the Chain Event Platform. Provides endpoints for managing applications, smart contract programs, webhooks, and event subscriptions.

## Overview

The Admin API serves as the central configuration hub for the Chain Event Platform. It handles:

- **Application Management**: Create and manage applications that group related programs and subscriptions
- **Program Registry**: Register smart contract ABIs for event detection
- **Webhook Configuration**: Configure webhook endpoints for event delivery
- **Subscription Management**: Define which events to monitor and where to send them
- **Authentication**: JWT-based authentication for secure API access
- **Dashboard Data**: Provide statistics and monitoring data

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Cache/Queue**: Redis 7 (ioredis)
- **Blockchain**: ethers.js 6
- **Authentication**: Passport.js with JWT
- **Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, Joi

## Module Structure

```
src/
├── modules/
│   ├── applications/      # Application CRUD operations
│   ├── programs/          # Smart contract ABI registry
│   ├── webhooks/          # Webhook endpoint management
│   ├── subscriptions/     # Event subscription configuration
│   ├── events/            # Event processing and storage
│   ├── auth/              # JWT authentication
│   ├── users/             # User management
│   ├── api-keys/          # API key management
│   ├── chains/            # Blockchain network configuration
│   ├── chain-sync-status/ # Block sync status tracking
│   ├── ingestor/          # Ingestor coordination
│   ├── dashboard/         # Statistics and monitoring
│   ├── webhook-logs/      # Webhook delivery logs
│   ├── statistics/        # Platform statistics
│   └── health/            # Health check endpoint
├── common/                # Shared utilities, guards, filters
├── database/              # Prisma service and setup
├── redis/                 # Redis client configuration
├── app.module.ts          # Root module
└── main.ts                # Application entry point
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL 16
- Redis 7

### Installation

```bash
# From repository root
pnpm install

# Or from this package directory
cd packages/admin-api
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
| `PORT` | Server port | `3001` |
| `API_PREFIX` | API route prefix | `api/v1` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiration | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` |
| `API_KEY_SALT` | Salt for API key hashing | - |
| `WEBHOOK_TEST_TIMEOUT_MS` | Webhook test timeout | `5000` |
| `RATE_LIMIT_TTL` | Rate limit window (seconds) | `60` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

### Database Setup

```bash
# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# (Optional) Open Prisma Studio
pnpm prisma:studio
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
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm prisma:seed` | Seed database with initial data |

## API Documentation

When running in development mode, Swagger documentation is available at:

```
http://localhost:3001/api/docs
```

### Key Endpoints

#### Applications
- `GET /api/v1/applications` - List all applications
- `POST /api/v1/applications` - Create application
- `GET /api/v1/applications/:id` - Get application details
- `PATCH /api/v1/applications/:id` - Update application
- `DELETE /api/v1/applications/:id` - Delete application

#### Programs
- `GET /api/v1/programs` - List registered programs
- `POST /api/v1/programs` - Register new program (with ABI)
- `GET /api/v1/programs/:id` - Get program details
- `DELETE /api/v1/programs/:id` - Unregister program

#### Webhooks
- `GET /api/v1/webhooks` - List webhooks
- `POST /api/v1/webhooks` - Create webhook
- `POST /api/v1/webhooks/:id/test` - Test webhook endpoint
- `PATCH /api/v1/webhooks/:id` - Update webhook
- `DELETE /api/v1/webhooks/:id` - Delete webhook

#### Subscriptions
- `GET /api/v1/subscriptions` - List subscriptions
- `POST /api/v1/subscriptions` - Create subscription
- `PATCH /api/v1/subscriptions/:id` - Update subscription
- `DELETE /api/v1/subscriptions/:id` - Delete subscription

#### Authentication
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

## Architecture

### Request Flow

```
Client Request
     │
     ▼
┌─────────────────┐
│   Guards        │  Authentication, Rate Limiting
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Interceptors  │  Logging, Transform Response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controller    │  Route handling, Validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Service       │  Business logic
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  Prisma ORM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │  Data persistence
└─────────────────┘
```

### Event Processing Integration

The Admin API coordinates with other services via Redis:

1. **Ingestor Coordination**: Provides chain configuration and sync status
2. **Event Detection**: Stores subscription rules for event matching
3. **Webhook Queue**: Receives detected events for webhook dispatch

## Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:cov

# Run e2e tests
pnpm test:e2e

# Watch mode
pnpm test:watch
```

## Related Components

- [admin-ui](../admin-ui) - Dashboard frontend
- [blockchain-event-ingestor](../blockchain-event-ingestor) - Block reader service
- [webhook-dispatcher](../webhook-dispatcher) - Event delivery service
