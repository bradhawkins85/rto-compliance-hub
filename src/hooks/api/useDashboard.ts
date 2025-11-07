import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

/**
 * Hook to fetch dashboard metrics
 */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => dashboardApi.getMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
