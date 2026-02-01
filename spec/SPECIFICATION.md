1. Blockchain Specifics

  - Which chains? EVM-compatible only (Ethereum, Polygon, BSC, etc.)
  - Node connectivity? During develop, I use my localhost node using Foundry(Anvil). But at Production, I will use the third party nodes(AllthatNode)
  - Starting point? Track from latest block

  2. Event Model

  - Event types to support? Contract event logs (e.g., Transfer, Approval) Only
  - Filtering granularity? Nothing

  3. Subscription & Webhook Design

  - Authentication model? API keys, OAuth, or both?
  - Webhook retry policy? Max retries, backoff strategy, dead-letter handling
  - Payload format? normalized schema

  4. Reliability Requirements

  - Delivery guarantee? At-least-once
  - Latency target? up to 1 seconds

  5. Infrastructure & Deployment

  - Target environment? Docker Compose for dev, Kubernetes for prod

  6. Admin Dashboard Scope

  - Features needed?
    - ABI management (upload, validate)
    - Webhook CRUD and Connection checking
    - Event history & logs

  7. Real-time Metrix Dashboard
    - Real-time block tracking status
    - Analytics / metrics
    - Use the Graphana tool

