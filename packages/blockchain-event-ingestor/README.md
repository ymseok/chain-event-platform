# Blockchain Event Ingestor

A service that polls blockchain networks for new blocks and queues them for event processing.

## Overview

The Blockchain Event Ingestor is responsible for:

- **Block Polling**: Continuously monitors blockchain networks for new blocks
- **Block Queuing**: Pushes new blocks to Redis queue for downstream processing
- **Sync Tracking**: Maintains synchronization status with the blockchain
- **Multi-Chain Support**: Designed to support multiple EVM-compatible networks

## Tech Stack

- **Language**: TypeScript 5
- **Runtime**: Node.js with tsx (for development)
- **Blockchain**: ethers.js 6
- **Queue**: Redis 7 (ioredis)
- **HTTP Client**: Axios
- **Logging**: Winston
- **Configuration**: dotenv

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Blockchain Event Ingestor                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │   Config     │────▶│  Block       │────▶│    Redis     │       │
│   │   Service    │     │  Poller      │     │    Queue     │       │
│   └──────────────┘     └──────────────┘     └──────────────┘       │
│          │                    │                     │                │
│          │                    │                     │                │
│          ▼                    ▼                     ▼                │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│   │  Admin API   │     │  Blockchain  │     │    Event     │       │
│   │  (Config)    │     │    Node      │     │   Handler    │       │
│   └──────────────┘     └──────────────┘     └──────────────┘       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── config/
│   └── index.ts           # Configuration management
├── services/
│   ├── blockchain.ts      # Blockchain connection service
│   ├── poller.ts          # Block polling service
│   ├── queue.ts           # Redis queue service
│   ├── config.ts          # Remote config from Admin API
│   └── logger.ts          # Winston logger setup
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   └── index.ts           # Utility functions
└── main.ts                # Application entry point
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Redis 7 running
- Admin API running (for configuration)
- Blockchain RPC endpoint (e.g., Anvil for local development)

### Installation

```bash
# From repository root
pnpm install

# Or from this package directory
cd packages/blockchain-event-ingestor
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
| `RPC_URL` | Blockchain JSON-RPC endpoint | `http://127.0.0.1:8545` |
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `ADMIN_API_URL` | Admin API base URL | `http://localhost:3001` |
| `POLL_INTERVAL_MS` | Block polling interval (ms) | `1000` |
| `LOG_LEVEL` | Logging level | `info` |

### Running the Application

```bash
# Development mode with hot reload
pnpm dev

# Build and run
pnpm build
pnpm start

# Development with ts-node
pnpm start:dev
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start with tsx watch (hot reload) |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm start` | Run compiled JavaScript |
| `pnpm start:dev` | Run with ts-node |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

## How It Works

### Block Polling Flow

1. **Initialization**
   - Connect to blockchain via RPC
   - Connect to Redis
   - Fetch configuration from Admin API

2. **Polling Loop**
   - Get current block number from blockchain
   - Compare with last processed block
   - Fetch new blocks (if any)
   - Push block data to Redis queue

3. **Sync Status**
   - Report sync status to Admin API
   - Track processed block numbers
   - Handle reorgs (chain reorganizations)

### Block Data Structure

```typescript
interface QueuedBlock {
  chainId: number;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  transactions: Transaction[];
  logs: Log[];
}
```

### Redis Queue Format

Blocks are pushed to a Redis list with key pattern:
```
blocks:queue:{chainId}
```

## Configuration

The ingestor fetches configuration from Admin API:

- **Active Chains**: Which blockchain networks to monitor
- **Starting Block**: Block number to start from (for new setups)
- **Registered Programs**: Contract addresses to watch

## Error Handling

- **RPC Errors**: Automatic retry with exponential backoff
- **Redis Errors**: Connection pooling and reconnection
- **Config Errors**: Graceful degradation with cached config

## Monitoring

### Logs

Winston logger outputs structured logs:

```
[INFO] Starting block polling...
[INFO] Connected to blockchain: chainId=31337
[INFO] Processing block 12345
[DEBUG] Queued block 12345 with 5 transactions
```

### Health Indicators

- Block sync lag (current vs. latest)
- Queue depth
- RPC response times
- Error rates

## Development

### Local Testing with Anvil

1. Start Anvil local blockchain:
   ```bash
   cd packages/demo-contract
   pnpm anvil
   ```

2. Configure `.env`:
   ```
   RPC_URL=http://127.0.0.1:8545
   ```

3. Start ingestor:
   ```bash
   pnpm dev
   ```

### Adding Support for New Chains

1. Register chain in Admin API
2. Configure RPC endpoint
3. Restart ingestor to pick up new configuration

## Related Components

- [admin-api](../admin-api) - Configuration and coordination
- [webhook-dispatcher](../webhook-dispatcher) - Event delivery service
- [demo-contract](../demo-contract) - Test contracts for local development
