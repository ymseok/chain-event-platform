import apiClient from './client';
import type {
  Application,
  PaginatedResponse,
  CreateApplicationDto,
  UpdateApplicationDto,
  Statistics,
} from '@/types';

export async function getApplications(
  page = 1,
  limit = 20
): Promise<PaginatedResponse<Application>> {
  const response = await apiClient.get<PaginatedResponse<Application>>('/applications', {
    params: { page, limit },
  });
  return response.data;
}

export async function getApplication(id: string): Promise<Application> {
  const response = await apiClient.get<Application>(`/applications/${id}`);
  return response.data;
}

export async function createApplication(data: CreateApplicationDto): Promise<Application> {
  const response = await apiClient.post<Application>('/applications', data);
  return response.data;
}

export async function updateApplication(
  id: string,
  data: UpdateApplicationDto
): Promise<Application> {
  const response = await apiClient.patch<Application>(`/applications/${id}`, data);
  return response.data;
}

export async function deleteApplication(id: string): Promise<void> {
  await apiClient.delete(`/applications/${id}`);
}

export async function getApplicationStats(
  appId: string,
  startDate?: string,
  endDate?: string
): Promise<Statistics> {
  const response = await apiClient.get<Statistics>(`/applications/${appId}/stats`, {
    params: { startDate, endDate },
  });
  return response.data;
}
