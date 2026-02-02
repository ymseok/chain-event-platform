export interface WebhookEvent {
  id: string;
  receivedAt: string;
  apiKeyPrefix: string;
  payload: WebhookPayload;
}

export interface WebhookPayload {
  type?: 'test' | 'event';
  timestamp?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
}

export interface StoredApiKey extends ApiKey {
  keyHash: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  key: string;
}

export interface SSEMessage {
  type: 'init' | 'event';
  events?: WebhookEvent[];
  event?: WebhookEvent;
}
