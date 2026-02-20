// Enums
export type Status = 'ACTIVE' | 'INACTIVE';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED';
export type WebhookLogStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type AppRole = 'OWNER' | 'MEMBER' | 'GUEST';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

// User
export interface User {
  id: string;
  email: string;
  name: string;
  isRoot: boolean;
  createdAt: string;
  updatedAt: string;
}

// Application
export interface Application {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  myRole?: AppRole;
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
  enabled: boolean;
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
  parameters: string; // Format: "(type1 name1, type2 name2, ...)"
  createdAt: string;
  program?: Program;
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

// Ingestor Instances
export interface IngestorClaimedApp {
  appId: string;
  appName: string;
  leaseTtlRemaining: number;
}

export interface IngestorInstance {
  instanceId: string;
  claimedApps: IngestorClaimedApp[];
}

export interface UnclaimedApp {
  appId: string;
  appName: string;
}

export interface IngestorInstancesResponse {
  instances: IngestorInstance[];
  unclaimedApps: UnclaimedApp[];
}

export interface RebalanceResponse {
  message: string;
  released: number;
  totalApps: number;
  totalInstances: number;
}

// Dispatcher Instances
export interface DispatcherClaimedApp {
  appId: string;
  appName: string;
  leaseTtlRemaining: number;
}

export interface DispatcherInstance {
  instanceId: string;
  claimedApps: DispatcherClaimedApp[];
}

export interface DispatcherInstancesResponse {
  instances: DispatcherInstance[];
  unclaimedApps: UnclaimedApp[];
}

// Member
export interface Member {
  id: string;
  applicationId: string;
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  createdAt: string;
  updatedAt: string;
}

// Invite
export interface Invite {
  id: string;
  applicationId: string;
  email: string;
  role: AppRole;
  status: InviteStatus;
  invitedBy: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  applicationName?: string;
  senderName?: string;
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
  filterConditions?: FilterCondition[] | null;
  status?: SubscriptionStatus;
}

// Member DTOs
export interface CreateInviteDto {
  email: string;
  role?: AppRole;
}

export interface UpdateMemberRoleDto {
  role: AppRole;
}

// Chain Admin DTOs
export interface CreateChainDto {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockTime?: number;
}

export interface UpdateChainDto {
  name?: string;
  chainId?: number;
  rpcUrl?: string;
  blockTime?: number;
  enabled?: boolean;
}

export interface RpcCheckResult {
  success: boolean;
  latestBlockNumber: number | null;
  responseTimeMs: number | null;
  message: string;
}

// Dashboard Event Statistics
export interface DailyEventStats {
  date: string;
  total: number;
  success: number;
  failed: number;
}

export interface DailyEventStatsResponse {
  data: DailyEventStats[];
  days: number;
}

export interface TopApplication {
  applicationId: string;
  applicationName: string;
  eventCount: number;
}

export interface TopApplicationsResponse {
  data: TopApplication[];
  days: number;
  limit: number;
}

export interface CumulativeStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  pendingEvents: number;
  successRate: number;
  avgResponseTimeMs: number;
}

export interface CumulativeStatsResponse {
  data: CumulativeStats;
  days: number;
}
