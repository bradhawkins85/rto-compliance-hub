import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/lib/api';
import type {
  ListComplaintsParams,
  CreateComplaintData,
  UpdateComplaintData,
  CloseComplaintData,
} from '@/lib/api';

/**
 * Hook to fetch complaints list
 */
export function useComplaints(params?: ListComplaintsParams) {
  return useQuery({
    queryKey: ['complaints', params],
    queryFn: () => complaintsApi.list(params),
  });
}

/**
 * Hook to fetch a single complaint
 */
export function useComplaint(id: string) {
  return useQuery({
    queryKey: ['complaints', id],
    queryFn: () => complaintsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch complaint timeline
 */
export function useComplaintTimeline(id: string) {
  return useQuery({
    queryKey: ['complaints', id, 'timeline'],
    queryFn: () => complaintsApi.getTimeline(id),
    enabled: !!id,
  });
}

/**
 * Hook to create complaint
 */
export function useCreateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateComplaintData) => complaintsApi.create(data),
    onSuccess: () => {
      // Invalidate and refetch complaints list
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

/**
 * Hook to update complaint
 */
export function useUpdateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateComplaintData }) =>
      complaintsApi.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific complaint and list
      queryClient.invalidateQueries({ queryKey: ['complaints', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

/**
 * Hook to close complaint
 */
export function useCloseComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CloseComplaintData }) =>
      complaintsApi.close(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific complaint and list
      queryClient.invalidateQueries({ queryKey: ['complaints', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

/**
 * Hook to escalate complaint
 */
export function useEscalateComplaint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      complaintsApi.escalate(id, notes),
    onSuccess: (_, variables) => {
      // Invalidate specific complaint and list
      queryClient.invalidateQueries({ queryKey: ['complaints', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

/**
 * Hook to add note to complaint
 */
export function useAddComplaintNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      complaintsApi.addNote(id, notes),
    onSuccess: (_, variables) => {
      // Invalidate complaint timeline and details
      queryClient.invalidateQueries({ queryKey: ['complaints', variables.id] });
    },
  });
}
