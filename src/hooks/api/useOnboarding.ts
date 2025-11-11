import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingWorkflow {
  id: string;
  name: string;
  description?: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  taskTemplates?: OnboardingTaskTemplate[];
  _count?: {
    assignments: number;
  };
}

export interface OnboardingTaskTemplate {
  id: string;
  workflowId: string;
  title: string;
  description?: string;
  taskType: string;
  department?: string;
  role?: string;
  orderIndex: number;
  daysToComplete: number;
  isRequired: boolean;
  sopId?: string;
  pdCategory?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingAssignment {
  id: string;
  userId: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  dueDate?: string;
  notificationSentAt?: string;
  createdAt: string;
  updatedAt: string;
  workflow?: {
    id: string;
    name: string;
    description?: string;
  };
  tasks?: OnboardingTask[];
}

export interface OnboardingTask {
  id: string;
  assignmentId: string;
  templateId?: string;
  title: string;
  description?: string;
  taskType: string;
  status: string;
  orderIndex: number;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  evidenceUrl?: string;
  notes?: string;
  sopId?: string;
  pdItemId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProgress {
  userId: string;
  assignments: {
    assignmentId: string;
    workflowId: string;
    workflowName: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    totalTasks: number;
    completedTasks: number;
    percentage: number;
  }[];
  overallProgress: number;
}

// ============================================================================
// WORKFLOWS
// ============================================================================

export function useOnboardingWorkflows(params?: { department?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['onboarding-workflows', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.department) queryParams.append('department', params.department);
      if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/workflows?${queryParams}`,
        { withCredentials: true }
      );
      return response.data;
    },
  });
}

export function useOnboardingWorkflow(id: string) {
  return useQuery({
    queryKey: ['onboarding-workflow', id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/workflows/${id}`,
        { withCredentials: true }
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<OnboardingWorkflow>) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/onboarding/workflows`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<OnboardingWorkflow>) => {
      const response = await axios.patch(
        `${API_BASE_URL}/api/v1/onboarding/workflows/${id}`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow', id] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(
        `${API_BASE_URL}/api/v1/onboarding/workflows/${id}`,
        { withCredentials: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
    },
  });
}

export function useAddTaskTemplate(workflowId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<OnboardingTaskTemplate>) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/onboarding/workflows/${workflowId}/templates`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-workflows'] });
    },
  });
}

// ============================================================================
// ASSIGNMENTS
// ============================================================================

export function useOnboardingAssignments(params?: { status?: string; userId?: string; workflowId?: string }) {
  return useQuery({
    queryKey: ['onboarding-assignments', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.userId) queryParams.append('userId', params.userId);
      if (params?.workflowId) queryParams.append('workflowId', params.workflowId);
      
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/assignments?${queryParams}`,
        { withCredentials: true }
      );
      return response.data;
    },
  });
}

export function useOnboardingAssignment(id: string) {
  return useQuery({
    queryKey: ['onboarding-assignment', id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/assignments/${id}`,
        { withCredentials: true }
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useUserAssignments(userId: string) {
  return useQuery({
    queryKey: ['user-onboarding-assignments', userId],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/assignments/user/${userId}`,
        { withCredentials: true }
      );
      return response.data;
    },
    enabled: !!userId,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { userId: string; workflowId: string }) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/onboarding/assignments`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['user-onboarding-assignments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress', variables.userId] });
    },
  });
}

// ============================================================================
// TASKS
// ============================================================================

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { status?: string; notes?: string; evidenceUrl?: string }) => {
      const response = await axios.patch(
        `${API_BASE_URL}/api/v1/onboarding/tasks/${taskId}`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['user-onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

export function useCompleteTask(taskId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { evidenceUrl?: string; notes?: string }) => {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/onboarding/tasks/${taskId}/complete`,
        data,
        { withCredentials: true }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['user-onboarding-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-progress'] });
    },
  });
}

// ============================================================================
// PROGRESS
// ============================================================================

export function useOnboardingProgress(userId: string) {
  return useQuery({
    queryKey: ['onboarding-progress', userId],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/onboarding/progress/${userId}`,
        { withCredentials: true }
      );
      return response.data as OnboardingProgress;
    },
    enabled: !!userId,
  });
}
