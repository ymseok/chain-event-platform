import apiClient from './client';
import type {
  DailyEventStatsResponse,
  TopApplicationsResponse,
  CumulativeStatsResponse,
} from '@/types';

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

export async function getDailyEventStats(days: number = 30): Promise<DailyEventStatsResponse> {
  const response = await apiClient.get<DailyEventStatsResponse>('/dashboard/events/daily', {
    params: { days },
  });
  return response.data;
}

export async function getTopApplications(
  days: number = 7,
  limit: number = 5
): Promise<TopApplicationsResponse> {
  const response = await apiClient.get<TopApplicationsResponse>('/dashboard/top-applications', {
    params: { days, limit },
  });
  return response.data;
}

export async function getCumulativeStats(days: number = 7): Promise<CumulativeStatsResponse> {
  const response = await apiClient.get<CumulativeStatsResponse>('/dashboard/cumulative', {
    params: { days },
  });
  return response.data;
}
