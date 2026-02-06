import apiClient from './client';
import type { ApiKey, ApiKeyWithSecret, CreateApiKeyDto, PaginatedResponse } from '@/types';

export async function getApiKeys(
  appId: string,
  page = 1,
  limit = 20
): Promise<PaginatedResponse<ApiKey>> {
  const response = await apiClient.get<PaginatedResponse<ApiKey>>(
    `/applications/${appId}/api-keys`,
    {
      params: { page, limit },
    }
  );
  return response.data;
}

export async function createApiKey(
  appId: string,
  data: CreateApiKeyDto
): Promise<ApiKeyWithSecret> {
  const response = await apiClient.post<ApiKeyWithSecret>(
    `/applications/${appId}/api-keys`,
    data
  );
  return response.data;
}

export async function revokeApiKey(_appId: string, keyId: string): Promise<void> {
  await apiClient.patch(`/api-keys/${keyId}/revoke`);
}
