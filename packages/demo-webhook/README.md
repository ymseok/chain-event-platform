# Demo Webhook

A demo application for testing webhook reception in the Chain Event Platform. This application provides a real-time monitoring dashboard to visualize incoming webhook events.

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- TypeScript

## Getting Started

### Development Mode

```bash
pnpm dev
```

### Production Mode

```bash
pnpm build
pnpm start
```

The server runs at `http://localhost:3003`.

## Testing

### 1. Create Test Script

Copy `src/scripts/test.sh.example` to create your own `test.sh` file.

```bash
cp src/scripts/test.sh.example src/scripts/test.sh
```

### 2. Start Demo Webhook Server

```bash
pnpm dev
```

### 3. Generate API Key

1. Open your browser and navigate to `http://localhost:3003`
2. Generate a new API Key from the dashboard
3. Copy the generated API Key

### 4. Configure Test Script

Open `src/scripts/test.sh` and replace the `API_KEY` value with your generated key.

```bash
# Before
API_KEY="YOUR_API_KEY"

# After
API_KEY="your_generated_api_key"
```

### 5. Run Test Script

```bash
chmod +x src/scripts/test.sh
./src/scripts/test.sh
```

The test script sends 200 webhook requests at 1-second intervals by default. You can modify the `COUNT` and `INTERVAL` variables to adjust the number of requests and the delay between them.

## Real-time Monitoring

Once the test script is running, you can observe the incoming webhook events **in real-time** on the Demo Webhook dashboard at `http://localhost:3003`.

The dashboard displays:
- **Event Log**: Live stream of all incoming webhook requests
- **Timestamp**: When each event was received
- **Payload**: The JSON data sent with each request

This real-time visualization allows you to verify that the Chain Event Platform is correctly dispatching events to your registered webhooks.
