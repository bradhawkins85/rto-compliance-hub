import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi } from '@/lib/api';
import type { ListAssetsParams, CreateAssetData, UpdateAssetData, LogServiceData, TransitionStateData } from '@/lib/api';

/**
 * Hook to fetch assets list
 */
export function useAssets(params?: ListAssetsParams) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => assetsApi.list(params),
  });
}

/**
 * Hook to fetch a single asset with service history
 */
export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch asset service history
 */
export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: ['assets', id, 'history'],
    queryFn: () => assetsApi.getHistory(id),
    enabled: !!id,
  });
}

/**
 * Hook to create an asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetData) => assetsApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch assets list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

/**
 * Hook to update an asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetData }) =>
      assetsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific asset and list
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

/**
 * Hook to log a service event
 */
export function useLogAssetService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LogServiceData }) =>
      assetsApi.logService(id, data),
    onSuccess: (_, variables) => {
      // Invalidate asset and history
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id, 'history'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

/**
 * Hook to transition asset state
 */
export function useTransitionAssetState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransitionStateData }) =>
      assetsApi.transitionState(id, data),
    onSuccess: (_, variables) => {
      // Invalidate asset and list
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

/**
 * Hook to delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => assetsApi.delete(id),
    onSuccess: () => {
      // Invalidate assets list
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
