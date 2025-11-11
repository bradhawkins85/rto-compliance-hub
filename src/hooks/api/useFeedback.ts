import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbackApi } from '@/lib/api';
import type { ListFeedbackParams, FeedbackInsightsParams } from '@/lib/api';

/**
 * Hook to fetch feedback list
 */
export function useFeedback(params?: ListFeedbackParams) {
  return useQuery({
    queryKey: ['feedback', params],
    queryFn: () => feedbackApi.list(params),
  });
}

/**
 * Hook to fetch a single feedback item
 */
export function useFeedbackItem(id: string) {
  return useQuery({
    queryKey: ['feedback', id],
    queryFn: () => feedbackApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch feedback insights
 */
export function useFeedbackInsights(params?: FeedbackInsightsParams) {
  return useQuery({
    queryKey: ['feedback', 'insights', params],
    queryFn: () => feedbackApi.getInsights(params),
  });
}

/**
 * Hook to create feedback
 */
export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: feedbackApi.create,
    onSuccess: () => {
      // Invalidate and refetch feedback list and insights
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

/**
 * Hook to update feedback
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof feedbackApi.update>[1] }) =>
      feedbackApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific feedback and list
      queryClient.invalidateQueries({ queryKey: ['feedback', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

/**
 * Hook to delete feedback
 */
export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: feedbackApi.delete,
    onSuccess: () => {
      // Invalidate feedback list
      queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
  });
}

/**
 * Hook to export feedback as CSV
 */
export function useExportFeedback() {
  return useMutation({
    mutationFn: async (params?: ListFeedbackParams) => {
      const blob = await feedbackApi.exportCSV(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
}
