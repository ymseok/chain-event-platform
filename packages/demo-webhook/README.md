# Demo Webhook

A demo application for testing webhook reception in the Chain Event Platform. Provides a real-time monitoring dashboard to visualize incoming webhook events.

## Overview

The Demo Webhook server acts as a subscriber endpoint for testing the Chain Event Platform pipeline. It:

- **Receives Webhooks**: Accepts HTTP POST requests with event payloads
- **Authenticates Requests**: Validates API keys for security
- **Displays Events**: Real-time dashboard showing incoming events
- **Logs Payloads**: Stores and displays event data for verification

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **Components**: Radix UI, Lucide React
- **UI**: Real-time event log display

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── webhook/       # Webhook receiver endpoint
│   ├── page.tsx           # Dashboard page
│   └── layout.tsx         # Root layout
├── components/
│   └── ui/                # UI components
├── lib/
│   └── utils.ts           # Utility functions
└── scripts/
    └── test.sh.example    # Test script template
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation

```bash
# From repository root
pnpm install

# Or from this package directory
cd packages/demo-webhook
pnpm install
```

### Running the Application

```bash
# Development mode
pnpm dev

# Production mode
pnpm build
pnpm start
```

The server runs at `http://localhost:3003`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server on port 3003 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Webhook Endpoint

### URL

```
POST http://localhost:3003/api/webhook
```

### Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `x-api-key` | API key for authentication |

### Expected Payload

```json
{
  "id": "evt_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "chainId": 31337,
  "blockNumber": 12345,
  "transactionHash": "0x...",
  "contractAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "eventName": "Transfer",
  "eventSignature": "Transfer(address,address,uint256)",
  "args": {
    "from": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "value": "1000000000000000000"
  }
}
```

### Response

| Status | Description |
|--------|-------------|
| 200 | Webhook received successfully |
| 401 | Invalid or missing API key |
| 400 | Invalid payload |

## Usage with Chain Event Platform

### Step 1: Start Demo Webhook Server

```bash
pnpm dev
```

### Step 2: Generate API Key

1. Open browser: `http://localhost:3003`
2. Click "Generate API Key" button
3. Copy the generated key (save it securely)

### Step 3: Register Webhook in Admin UI

1. Open Admin UI: `http://localhost:3002`
2. Navigate to **Webhooks** > **Create Webhook**
3. Configure:
   - **URL**: `http://localhost:3003/api/webhook`
   - **Headers**: Add `x-api-key` with your generated key
4. Save the webhook

### Step 4: Create Subscription

1. Navigate to **Subscriptions** > **Create Subscription**
2. Select program and event type
3. Select the webhook created in Step 3
4. Activate the subscription

### Step 5: Monitor Events

1. Trigger blockchain events (using demo-contract scripts)
2. Watch the Demo Webhook dashboard for incoming events

## Real-time Monitoring

The dashboard displays:

| Column | Description |
|--------|-------------|
| **Timestamp** | When the event was received |
| **Event Type** | Event name (e.g., Transfer, Approval) |
| **Block** | Block number where event occurred |
| **Contract** | Smart contract address |
| **Payload** | Expandable JSON event data |

## Testing Independently

### Using curl

```bash
curl -X POST http://localhost:3003/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "id": "test_001",
    "timestamp": "2024-01-15T10:30:00Z",
    "eventName": "Transfer",
    "args": {
      "from": "0x123...",
      "to": "0x456...",
      "value": "1000000000000000000"
    }
  }'
```

### Using Test Script

1. Copy the example script:
   ```bash
   cp src/scripts/test.sh.example src/scripts/test.sh
   ```

2. Edit `test.sh` with your API key:
   ```bash
   API_KEY="your_generated_api_key"
   ```

3. Run the script:
   ```bash
   chmod +x src/scripts/test.sh
   ./src/scripts/test.sh
   ```

The test script sends multiple webhook requests at configured intervals.

## Configuration

### Test Script Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_KEY` | Your generated API key | - |
| `WEBHOOK_URL` | Demo webhook endpoint | `http://localhost:3003/api/webhook` |
| `COUNT` | Number of requests to send | `200` |
| `INTERVAL` | Delay between requests (seconds) | `1` |

## Development Notes

### Adding Custom Validation

Edit `src/app/api/webhook/route.ts` to add custom payload validation.

### Persisting Events

By default, events are stored in memory. For persistence, integrate a database.

## Related Components

- [admin-api](../admin-api) - Webhook configuration
- [admin-ui](../admin-ui) - UI for webhook setup
- [webhook-dispatcher](../webhook-dispatcher) - Delivers events to this endpoint
- [demo-contract](../demo-contract) - Generates test events
