import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { standardsApi } from '@/lib/api';
import type { ListStandardsParams } from '@/lib/api';

/**
 * Hook to fetch standards list
 */
export function useStandards(params?: ListStandardsParams) {
  return useQuery({
    queryKey: ['standards', params],
    queryFn: () => standardsApi.list(params),
  });
}

/**
 * Hook to fetch a single standard
 */
export function useStandard(id: string) {
  return useQuery({
    queryKey: ['standards', id],
    queryFn: () => standardsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch standard mappings
 */
export function useStandardMappings(id: string) {
  return useQuery({
    queryKey: ['standards', id, 'mappings'],
    queryFn: () => standardsApi.getMappings(id),
    enabled: !!id,
  });
}
