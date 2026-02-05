import { useQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getDailyEventStats,
  getTopApplications,
  getCumulativeStats,
} from '@/lib/api/dashboard';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  dailyEventStats: (days: number) => [...dashboardKeys.all, 'dailyEventStats', days] as const,
  topApplications: (days: number, limit: number) =>
    [...dashboardKeys.all, 'topApplications', days, limit] as const,
  cumulativeStats: (days: number) => [...dashboardKeys.all, 'cumulativeStats', days] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });
}

export function useDailyEventStats(days: number = 30) {
  return useQuery({
    queryKey: dashboardKeys.dailyEventStats(days),
    queryFn: () => getDailyEventStats(days),
    refetchInterval: 30000,
  });
}

export function useTopApplications(days: number = 7, limit: number = 5) {
  return useQuery({
    queryKey: dashboardKeys.topApplications(days, limit),
    queryFn: () => getTopApplications(days, limit),
    refetchInterval: 30000,
  });
}

export function useCumulativeStats(days: number = 7) {
  return useQuery({
    queryKey: dashboardKeys.cumulativeStats(days),
    queryFn: () => getCumulativeStats(days),
    refetchInterval: 30000,
  });
}
