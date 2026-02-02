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
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Block Ingestor │────▶│  Event Handler   │────▶│ Webhook Dispatcher │
│  (Reads blocks) │     │ (Detects events) │     │ (Delivers events)  │
└─────────────────┘     └──────────────────┘     └────────────────────┘
                                                           │
┌─────────────────┐     ┌──────────────────┐               │
│    Admin UI     │────▶│    Admin API     │◀──────────────┘
│   (Dashboard)   │     │ (Configuration)  │
└─────────────────┘     └──────────────────┘
```

### Components

| Package | Description |
|---------|-------------|
| `admin-api` | REST API for managing applications, programs, webhooks, and subscriptions |
| `admin-ui` | Dashboard for monitoring and configuration |
| `block-ingestor` | Reads blocks from blockchain nodes and queues them |
| `event-handler` | Processes queued blocks and detects registered events |
| `webhook-dispatcher` | Delivers detected events to registered webhook endpoints |

## Tech Stack

- **Backend**: TypeScript, NestJS, Prisma ORM, ethers.js
- **Frontend**: TypeScript, Next.js 14, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL 16
- **Message Queue**: Redis 7
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

### 3. Start Infrastructure Services

Start PostgreSQL and Redis using Docker Compose:

```bash
pnpm docker:up
```

### 4. Configure Environment

```bash
# Copy environment template
cp packages/admin-api/.env.example packages/admin-api/.env

# Edit configuration as needed
```

### 5. Initialize Database

```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate
```

### 6. Start Development Servers

```bash
# Start Admin API (http://localhost:3000)
pnpm dev:admin-api

# In another terminal, start Admin UI (http://localhost:3001)
pnpm dev:admin-ui
```

## Local Blockchain Development with Foundry

[Foundry](https://book.getfoundry.sh/) provides a fast, portable toolkit for Ethereum development. Use **Anvil** to run a local blockchain for testing event subscriptions.

### Installing Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Run foundryup to install the latest version
foundryup
```

### Running Local Blockchain with Anvil

```bash
# Start a local Ethereum node
anvil

# With custom options
anvil --port 8545 --chain-id 31337 --block-time 2
```

Default Anvil configuration:
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Pre-funded accounts with 10,000 ETH each

### Deploying Test Contracts

Use Forge to compile and deploy contracts for testing:

```bash
# Create a new Foundry project (if needed)
forge init contracts

# Compile contracts
cd contracts && forge build

# Deploy to local Anvil instance
forge create --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  src/YourContract.sol:YourContract
```

### Testing Event Subscriptions Locally

1. Start Anvil local blockchain
2. Deploy your smart contract
3. Register the contract program in Admin UI with the contract's ABI
4. Create a webhook endpoint (use [webhook.site](https://webhook.site) for testing)
5. Subscribe to specific events
6. Interact with the contract to emit events
7. Verify webhook delivery in the dashboard

### Cast Commands for Testing

```bash
# Send a transaction to trigger events
cast send <CONTRACT_ADDRESS> "yourFunction()" \
  --rpc-url http://127.0.0.1:8545 \
  --private-key <PRIVATE_KEY>

# Read contract state
cast call <CONTRACT_ADDRESS> "yourViewFunction()" \
  --rpc-url http://127.0.0.1:8545

# Get current block number
cast block-number --rpc-url http://127.0.0.1:8545
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm docker:up` | Start PostgreSQL and Redis containers |
| `pnpm docker:down` | Stop infrastructure containers |
| `pnpm docker:logs` | View container logs |
| `pnpm dev:admin-api` | Start Admin API in development mode |
| `pnpm dev:admin-ui` | Start Admin UI in development mode |
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
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiration | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `7d` |

## Project Structure

```
chain-event-platform/
├── packages/
│   ├── admin-api/          # NestJS backend API
│   │   ├── src/
│   │   │   ├── modules/    # Feature modules
│   │   │   ├── common/     # Shared utilities
│   │   │   └── prisma/     # Database schema
│   │   └── docker-compose.yml
│   ├── admin-ui/           # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/        # App router pages
│   │   │   ├── components/ # React components
│   │   │   └── lib/        # Utilities & hooks
│   ├── block-ingestor/     # Block reader service
│   ├── event-handler/      # Event processor service
│   └── webhook-dispatcher/ # Webhook delivery service
├── docs/                   # Documentation
└── spec/                   # Specifications
```

## API Documentation

Once the Admin API is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the coding standards
3. Write tests for new functionality
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.
