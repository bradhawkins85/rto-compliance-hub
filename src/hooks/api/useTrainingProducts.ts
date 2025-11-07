import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trainingProductsApi } from '@/lib/api';
import type { ListTrainingProductsParams } from '@/lib/api';

/**
 * Hook to fetch training products list
 */
export function useTrainingProducts(params?: ListTrainingProductsParams) {
  return useQuery({
    queryKey: ['training-products', params],
    queryFn: () => trainingProductsApi.list(params),
  });
}

/**
 * Hook to fetch a single training product with details
 */
export function useTrainingProduct(id: string) {
  return useQuery({
    queryKey: ['training-products', id],
    queryFn: () => trainingProductsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a training product
 */
export function useCreateTrainingProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: trainingProductsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-products'] });
    },
  });
}

/**
 * Hook to update a training product
 */
export function useUpdateTrainingProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof trainingProductsApi.update>[1] }) =>
      trainingProductsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-products', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['training-products'] });
    },
  });
}
