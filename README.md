# Chain Event Platform

A centralized blockchain event aggregation and dispatch platform that eliminates redundant blockchain tracking across services.

## Overview

Chain Event Platform acts as middleware that monitors blockchain networks and dispatches relevant events to subscriber services. Instead of each service independently tracking blockchain blocks, this platform provides a unified solution for event detection and delivery.

### Key Features

- **Centralized Block Tracking**: Single engine monitors blockchain to prevent redundant node queries
- **Event Subscription**: Services register specific smart contract events to monitor
- **Webhook Dispatch**: Automatic event delivery via registered webhooks
- **Multi-Chain Support**: Designed to support multiple EVM-compatible networks

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           Chain Event Platform                                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│   ┌─────────────┐                                                                │
│   │  Blockchain │                                                                │
│   │   Network   │                                                                │
│   └──────┬──────┘                                                                │
│          │ RPC                                                                   │
│          ▼                                                                       │
│   ┌──────────────────┐     ┌─────────┐     ┌────────────────┐                   │
│   │ Blockchain Event │────▶│  Redis  │────▶│ Event Handler  │                   │
│   │    Ingestor      │     │ (Queue) │     │   (Processor)  │                   │
│   └──────────────────┘     └─────────┘     └───────┬────────┘                   │
│                                                     │                            │
│                                                     │ Detected Events            │
│                                                     ▼                            │
│   ┌──────────────────┐     ┌─────────┐     ┌────────────────┐                   │
│   │     Admin UI     │────▶│ Admin   │◀────│    Webhook     │                   │
│   │   (Dashboard)    │     │   API   │     │   Dispatcher   │                   │
│   └──────────────────┘     └────┬────┘     └───────┬────────┘                   │
│                                 │                   │                            │
│                                 │ PostgreSQL        │ HTTP POST                  │
│                                 ▼                   ▼                            │
│                          ┌──────────┐      ┌───────────────┐                    │
│                          │ Database │      │   Subscriber  │                    │
│                          │ (Config) │      │   Services    │                    │
│                          └──────────┘      └───────────────┘                    │
│                                                                                   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Event Processing Flow                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. Block Ingestion          2. Event Detection         3. Webhook Dispatch     │
│  ─────────────────          ─────────────────          ───────────────────      │
│                                                                                  │
│  ┌───────────┐              ┌───────────────┐          ┌─────────────────┐      │
│  │ Blockchain│   Blocks    │ Event Handler │  Events  │    Webhook      │      │
│  │  Ingestor │────────────▶│ - ABI Decode  │─────────▶│   Dispatcher    │      │
│  │           │   (Redis)   │ - Event Match │  (Redis) │ - HTTP Delivery │      │
│  └───────────┘              └───────────────┘          └────────┬────────┘      │
│       │                           │                              │               │
│       │ Poll blocks               │ Match subscriptions          │ POST webhook  │
│       ▼                           ▼                              ▼               │
│  ┌───────────┐              ┌───────────────┐          ┌─────────────────┐      │
│  │   JSON    │              │  Registered   │          │   Subscriber    │      │
│  │   RPC     │              │    Events     │          │    Endpoint     │      │
│  └───────────┘              └───────────────┘          └─────────────────┘      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Package | Description | Port |
|---------|-------------|------|
| `admin-api` | REST API for managing applications, programs, webhooks, and subscriptions | 3001 |
| `admin-ui` | Dashboard for monitoring and configuration | 3002 |
| `blockchain-event-ingestor` | Reads blocks from blockchain nodes and queues them | - |
| `webhook-dispatcher` | Delivers detected events to registered webhook endpoints | - |
| `demo-contract` | Sample ERC20 token contract for testing | - |
| `demo-webhook` | Demo webhook receiver for testing event delivery | 3003 |

> Note: `event-handler` is currently integrated within `admin-api`.

## Tech Stack

- **Backend**: TypeScript, NestJS, Prisma ORM, ethers.js
- **Frontend**: TypeScript, Next.js 14, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL 16
- **Message Queue**: Redis 7
- **Smart Contracts**: Solidity, Foundry (Forge, Anvil, Cast)
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for local blockchain testing)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/chain-event-platform.git
cd chain-event-platform
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
# Copy environment template
cp packages/admin-api/.env.example packages/admin-api/.env
cp packages/blockchain-event-ingestor/.env.example packages/blockchain-event-ingestor/.env

# Edit configuration as needed
```

### 4. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
pnpm docker:up
```

Verify containers are running:

```bash
docker ps
# Should show postgres and redis containers
```

### 5. Initialize Database

```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate
```

## Local Development Testing Guide

This section provides a step-by-step guide for testing the complete event pipeline locally.

### Prerequisites for Testing

Ensure you have:
- Docker running (for PostgreSQL and Redis)
- Foundry installed (`foundryup` to install/update)
- All dependencies installed (`pnpm install`)

### Step 1: Start Infrastructure Services

```bash
# Start PostgreSQL and Redis containers
pnpm docker:up

# Verify containers are running
docker ps
# Expected: postgres (5432), redis (6379)
```

### Step 2: Initialize Database Schema

```bash
# Generate Prisma client and run migrations
pnpm prisma:generate
pnpm prisma:migrate

# (Optional) Verify database with Prisma Studio
pnpm prisma:studio
# Opens browser at http://localhost:5555
```

### Step 3: Start Admin API

```bash
# Terminal 1: Start Admin API server
pnpm dev:admin-api

# Wait for message: "Application is running on: http://localhost:3001"
# API docs available at: http://localhost:3001/api/docs
```

### Step 4: Start Admin UI

```bash
# Terminal 2: Start Admin UI
pnpm dev:admin-ui

# Access at: http://localhost:3002
```

### Step 5: Start Demo Webhook Server

```bash
# Terminal 3: Start demo webhook receiver
pnpm dev:demo-webhook

# Access at: http://localhost:3003
# Generate an API Key from the dashboard (save it for later)
```

### Step 6: Start Local Blockchain (Anvil)

```bash
# Terminal 4: Start Anvil local blockchain
cd packages/demo-contract
pnpm anvil

# Anvil starts with:
# - RPC URL: http://127.0.0.1:8545
# - Chain ID: 31337
# - Pre-funded test accounts (10,000 ETH each)
```

### Step 7: Deploy SampleToken Contract

```bash
# Terminal 5: Deploy the test ERC20 contract
cd packages/demo-contract
pnpm deploy:local

# Expected output shows deployed contract address:
# "SampleToken deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
```

### Step 8: Configure via Admin UI

Open http://localhost:3002 in your browser and perform the following:

#### 8.1 Create Application
1. Navigate to **Applications** menu
2. Click **Create Application**
3. Fill in application name and description
4. Save the created application

#### 8.2 Register Program (Smart Contract ABI)
1. Navigate to **Programs** menu
2. Click **Register Program**
3. Enter contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
4. Upload ABI file: `packages/demo-contract/out/SampleToken.sol/SampleToken.json`
5. Select the application created in step 8.1

#### 8.3 Register Webhook
1. Navigate to **Webhooks** menu
2. Click **Create Webhook**
3. Enter webhook URL: `http://localhost:3003/api/webhook`
4. Add header: `x-api-key` with the API key from Step 5
5. Save the webhook configuration

#### 8.4 Create Subscription
1. Navigate to **Subscriptions** menu
2. Click **Create Subscription**
3. Select the registered program
4. Select event type (e.g., `Transfer` or `Approval`)
5. Select the webhook to receive events
6. Activate the subscription

### Step 9: Start Event Processing Services

```bash
# Terminal 6: Start Blockchain Event Ingestor
pnpm dev:blockchain-event-ingestor

# Terminal 7: Start Webhook Dispatcher
pnpm dev:webhook-dispatcher
```

### Step 10: Generate Test Events

Execute test scripts to generate blockchain events:

```bash
cd packages/demo-contract/ext_script

# Test Transfer event
./transfer.sh
# Transfers 1 token from account[0] to account[1]

# Test Approval event
./approve.sh
# Approves account[1] to spend tokens on behalf of account[0]
```

### Step 11: Verify Event Delivery

1. Open **Demo Webhook** dashboard: http://localhost:3003
2. Check the **Event Log** for incoming webhook requests
3. Verify:
   - Event type matches (Transfer/Approval)
   - Payload contains correct event data
   - Timestamp is recent

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection error | Verify PostgreSQL is running: `docker ps` |
| Redis connection error | Verify Redis is running: `docker ps` |
| Contract deployment fails | Ensure Anvil is running on port 8545 |
| No events received | Check subscription is active in Admin UI |
| Webhook delivery fails | Verify demo-webhook is running and API key is correct |

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm docker:up` | Start PostgreSQL and Redis containers |
| `pnpm docker:down` | Stop infrastructure containers |
| `pnpm docker:logs` | View container logs |
| `pnpm dev:admin-api` | Start Admin API in development mode |
| `pnpm dev:admin-ui` | Start Admin UI in development mode |
| `pnpm dev:demo-webhook` | Start Demo Webhook server |
| `pnpm dev:blockchain-event-ingestor` | Start Block Ingestor |
| `pnpm dev:webhook-dispatcher` | Start Webhook Dispatcher |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests across all packages |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format code with Prettier |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:studio` | Open Prisma Studio |

## Environment Variables

### Admin API

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiration | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` |

### Blockchain Event Ingestor

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Blockchain RPC endpoint | `http://127.0.0.1:8545` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `ADMIN_API_URL` | Admin API URL for configuration | `http://localhost:3001` |

## Project Structure

```
chain-event-platform/
├── packages/
│   ├── admin-api/                 # NestJS backend API
│   │   ├── src/
│   │   │   ├── modules/           # Feature modules
│   │   │   │   ├── applications/  # Application management
│   │   │   │   ├── programs/      # Smart contract ABI registry
│   │   │   │   ├── webhooks/      # Webhook configuration
│   │   │   │   ├── subscriptions/ # Event subscriptions
│   │   │   │   ├── events/        # Event processing
│   │   │   │   ├── auth/          # Authentication
│   │   │   │   └── ...
│   │   │   ├── common/            # Shared utilities
│   │   │   ├── database/          # Prisma setup
│   │   │   └── redis/             # Redis client
│   │   ├── prisma/                # Database schema
│   │   └── docker-compose.yml     # Infrastructure services
│   │
│   ├── admin-ui/                  # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/               # App router pages
│   │   │   ├── components/        # React components
│   │   │   └── lib/               # Utilities & hooks
│   │   └── ...
│   │
│   ├── blockchain-event-ingestor/ # Block reader service
│   │   ├── src/
│   │   │   ├── services/          # Core services
│   │   │   ├── config/            # Configuration
│   │   │   └── main.ts            # Entry point
│   │   └── ...
│   │
│   ├── webhook-dispatcher/        # Webhook delivery service
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   └── dispatcher/    # Dispatch logic
│   │   │   ├── common/            # Shared utilities
│   │   │   └── main.ts            # Entry point
│   │   └── ...
│   │
│   ├── demo-contract/             # Foundry smart contracts
│   │   ├── src/                   # Solidity contracts
│   │   ├── script/                # Deployment scripts
│   │   ├── test/                  # Contract tests
│   │   ├── ext_script/            # External test scripts
│   │   └── out/                   # Compiled artifacts
│   │
│   └── demo-webhook/              # Webhook receiver for testing
│       ├── src/
│       │   └── app/               # Next.js app
│       └── ...
│
├── docs/                          # Documentation
├── spec/                          # Specifications
└── CLAUDE.md                      # Project instructions
```

## API Documentation

Once the Admin API is running, access the Swagger documentation at:

```
http://localhost:3001/api/docs
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Write tests for new functionality
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
