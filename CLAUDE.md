# Project : Chain Event Platform

## Project Purpose: Blockchain Event Aggregation & Dispatch Platform
The goal of this project is to eliminate the redundancy of individual services tracking blockchain blocks independently. This platform acts as a centralized middleware that monitors blockchain networks and dispatches relevant events to subscriber services.

### Core Mechanisms
- **Centralized Tracking**: A unified engine tracks blocks and identifies events to prevent redundant blockchain node queries.
- **Event Subscription**: External services register specific events they want to monitor.
- **Webhook Dispatcher**: When a registered event is detected, the platform triggers the corresponding Hook API (Webhook) registered by the subscriber.

## Architecture Overview
The platform consists of 5 main components:
- **Ingestor**: Reads blockchain blocks and queues them
- **Event Processor**: Detects registered events from queued blocks
- **Notification Service**: Delivers events via registered webhooks
- **Admin Service**: Manages ABI and webhook registrations
- **Dashboard**: Monitors block tracking and event processing

## Structure
.
├── apps
│   ├── admin-api
│   ├── admin-ui
│   ├── block-ingestor
│   ├── event-handler
│   └── webhook-dispatcher
└── docs

## Tech Stack
- **Backend**: Typescript, Nest.js, Prisma
- **Frontend**: Typescript, Next.js, Tailwind CSS
- **DBMS**: PostgreSQL
- **Message Queue**: Redis
- **Monitoring**: Grafana

## Specification

For detailed specifications, refer to the documents in /spec/*.md if necessary.


## Technology Direction
- **Strongly-typed languages**: All development should prioritize statically typed languages (e.g., TypeScript, Go, Rust).
- **Backend-first architecture**: Business logic and API design should be prioritized before UI development.
- **Cloud-native and container-friendly**: All services must be designed to be containerizable (Docker-ready) and deployable in cloud environments.

## Interaction Rules
- **Structure proposals**: Before creating any new files or directories, always propose the expected directory structure and wait for approval.
- **Decision rationale**: When selecting a specific technology or library, always explain the trade-offs, including both pros and cons.
- **Infrastructure changes**: Before introducing any new infrastructure components (e.g., databases, Redis, message queues), always ask for explicit user approval first.

