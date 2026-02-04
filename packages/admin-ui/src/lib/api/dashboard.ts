import apiClient from './client';

export interface DashboardStats {
  applications: number;
  programs: number;
  webhooks: number;
  subscriptions: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiClient.get<DashboardStats>('/dashboard/stats');
  return response.data;
}
