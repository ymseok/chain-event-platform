// Enums
export type Status = 'ACTIVE' | 'INACTIVE';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED';
export type WebhookLogStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Application
export interface Application {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

// API Key
export interface ApiKey {
  id: string;
  applicationId: string;
  name: string;
  keyPrefix: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string; // Only available on creation
}

// Chain
export interface Chain {
  id: number;
  name: string;
  chainId: number;
  rpcUrl: string;
  blockTime: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

// Program (Smart Contract)
export interface Program {
  id: string;
  applicationId: string;
  chainId: number;
  name: string;
  contractAddress: string;
  abi: unknown;
  status: Status;
  createdAt: string;
  updatedAt: string;
  chain?: Chain;
  _count?: {
    events: number;
  };
}

// Event
export interface Event {
  id: string;
  programId: string;
  name: string;
  signature: string;
  parameters: EventParameter[];
  createdAt: string;
  program?: Program;
}

export interface EventParameter {
  name: string;
  type: string;
  indexed: boolean;
}

// Webhook
export interface Webhook {
  id: string;
  applicationId: string;
  name: string;
  url: string;
  secret: string;
  headers: Record<string, string> | null;
  retryPolicy: RetryPolicy;
  status: Status;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
    logs: number;
  };
}

export interface RetryPolicy {
  maxRetries: number;
  retryInterval: number;
  backoffMultiplier: number;
}

// Subscription
export interface Subscription {
  id: string;
  eventId: string;
  webhookId: string;
  filterConditions: FilterCondition[] | null;
  status: SubscriptionStatus;
  createdAt: string;
  updatedAt: string;
  event?: Event;
  webhook?: Webhook;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
  value: string | number | boolean;
}

// Webhook Log
export interface WebhookLog {
  id: string;
  webhookId: string;
  eventSubscriptionId: string;
  eventPayload: unknown;
  requestPayload: unknown;
  responseStatus: number | null;
  responseBody: string | null;
  responseTimeMs: number | null;
  attemptCount: number;
  status: WebhookLogStatus;
  errorMessage: string | null;
  succeededAt: string | null;
  failedAt: string | null;
  createdAt: string;
  webhook?: Webhook;
  eventSubscription?: Subscription;
}

// Statistics
export interface Statistics {
  period: {
    startDate: string;
    endDate: string;
  };
  programs: {
    total: number;
  };
  webhooks: {
    total: number;
  };
  subscriptions: {
    total: number;
  };
  deliveries: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    successRate: number;
  };
  performance: {
    avgResponseTimeMs: number;
  };
}

// Pagination
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Auth
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

// API Error
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Create/Update DTOs
export interface CreateApplicationDto {
  name: string;
  description?: string;
}

export interface UpdateApplicationDto {
  name?: string;
  description?: string;
  status?: Status;
}

export interface CreateApiKeyDto {
  name: string;
  expiresAt?: string;
}

export interface CreateProgramDto {
  chainId: number;
  name: string;
  contractAddress: string;
  abi: string;
}

export interface UpdateProgramDto {
  name?: string;
  status?: Status;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<RetryPolicy>;
  status?: Status;
}

export interface CreateSubscriptionDto {
  eventId: string;
  webhookId: string;
  filterConditions?: FilterCondition[];
}

export interface UpdateSubscriptionDto {
  filterConditions?: FilterCondition[];
  status?: SubscriptionStatus;
}
