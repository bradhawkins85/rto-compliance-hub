import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi } from '@/lib/api';
import type { ListPoliciesParams } from '@/lib/api';

/**
 * Hook to fetch policies list
 */
export function usePolicies(params?: ListPoliciesParams) {
  return useQuery({
    queryKey: ['policies', params],
    queryFn: () => policiesApi.list(params),
  });
}

/**
 * Hook to fetch a single policy
 */
export function usePolicy(id: string) {
  return useQuery({
    queryKey: ['policies', id],
    queryFn: () => policiesApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch policy with versions
 */
export function usePolicyWithVersions(id: string) {
  return useQuery({
    queryKey: ['policies', id, 'versions'],
    queryFn: () => policiesApi.getWithVersions(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a policy
 */
export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: policiesApi.create,
    onSuccess: () => {
      // Invalidate and refetch policies list
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

/**
 * Hook to update a policy
 */
export function useUpdatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof policiesApi.update>[1] }) =>
      policiesApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific policy and list
      queryClient.invalidateQueries({ queryKey: ['policies', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

/**
 * Hook to publish a policy version
 */
export function usePublishPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof policiesApi.publish>[1] }) =>
      policiesApi.publish(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['policies', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}
