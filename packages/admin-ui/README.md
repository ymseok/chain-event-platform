# Admin UI

Web dashboard for the Chain Event Platform. Provides a user interface for managing applications, programs, webhooks, subscriptions, and monitoring event processing.

## Overview

The Admin UI is a modern React dashboard built with Next.js 14. It enables administrators to:

- **Manage Applications**: Create and organize applications
- **Register Programs**: Upload smart contract ABIs and configure monitored contracts
- **Configure Webhooks**: Set up webhook endpoints with custom headers
- **Create Subscriptions**: Define which events to track and where to deliver them
- **Monitor Activity**: View dashboard statistics and event processing status
- **Track Deliveries**: Review webhook delivery logs and status

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **Components**: Radix UI primitives, shadcn/ui
- **State Management**: Zustand 5
- **Data Fetching**: TanStack Query 5
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: Sonner

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard layout group
│   │   ├── applications/   # Application management pages
│   │   ├── programs/       # Program registry pages
│   │   ├── webhooks/       # Webhook configuration pages
│   │   ├── subscriptions/  # Subscription management pages
│   │   └── page.tsx        # Dashboard home
│   ├── auth/               # Authentication pages
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── forms/              # Form components
│   ├── tables/             # Data table components
│   └── layout/             # Layout components
├── lib/
│   ├── api/                # API client functions
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand stores
│   └── utils/              # Utility functions
├── types/                  # TypeScript type definitions
└── test/                   # Test utilities
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Admin API running on localhost:3001

### Installation

```bash
# From repository root
pnpm install

# Or from this package directory
cd packages/admin-ui
pnpm install
```

### Environment Setup

Create a `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Running the Application

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start
```

The application runs at `http://localhost:3002`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server on port 3002 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:ui` | Run tests with UI |

## Features

### Dashboard

The main dashboard provides an overview of:
- Total applications, programs, and webhooks
- Active subscriptions count
- Recent event activity
- System health status

### Application Management

- Create, edit, and delete applications
- View associated programs and subscriptions
- Application-level statistics

### Program Registry

- Register smart contracts with ABI upload
- Automatic event extraction from ABI
- Contract address validation
- Chain selection for multi-chain support

### Webhook Configuration

- Create webhooks with custom URLs
- Configure HTTP headers (e.g., API keys)
- Test webhook connectivity
- View delivery statistics

### Subscription Management

- Subscribe to specific contract events
- Filter events by parameters
- Associate webhooks with subscriptions
- Enable/disable subscriptions

### Monitoring

- Real-time block sync status
- Webhook delivery logs
- Event processing metrics
- Error tracking

## UI Components

The UI is built with shadcn/ui components, which are:
- Fully accessible (WCAG compliant)
- Customizable via Tailwind CSS
- Built on Radix UI primitives

Key components used:
- `Dialog` - Modal dialogs for forms
- `DropdownMenu` - Action menus
- `Select` - Selection inputs
- `Tabs` - Tabbed interfaces
- `Tooltip` - Contextual hints
- `Table` - Data tables

## API Integration

The UI communicates with the Admin API using TanStack Query for:
- Automatic caching
- Background refetching
- Optimistic updates
- Error handling

Example query usage:

```typescript
// lib/hooks/useApplications.ts
export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications'),
  });
}
```

## Testing

```bash
# Run all tests
pnpm test

# Run with UI
pnpm test:ui

# Watch mode
pnpm test -- --watch
```

Testing stack:
- Vitest - Test runner
- Testing Library - Component testing
- jsdom - DOM simulation

## Development Notes

### Adding New Pages

1. Create page component in `src/app/(dashboard)/[feature]/page.tsx`
2. Add API functions in `src/lib/api/`
3. Create custom hooks in `src/lib/hooks/`
4. Build form components as needed

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow the existing color scheme (CSS variables in globals.css)
- Maintain responsive design (mobile-first approach)
- Use `cn()` utility for conditional classes

## Related Components

- [admin-api](../admin-api) - Backend API
- [demo-webhook](../demo-webhook) - Test webhook receiver
