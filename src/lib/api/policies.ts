import apiClient from './client';
import type {
  Policy,
  PolicyWithVersions,
  PaginatedResponse,
  ListPoliciesParams,
} from './types';

/**
 * Policies API Service
 */
export const policiesApi = {
  /**
   * List policies with pagination
   */
  async list(params?: ListPoliciesParams): Promise<PaginatedResponse<Policy>> {
    const response = await apiClient.get<PaginatedResponse<Policy>>('/policies', {
      params,
    });
    return response.data;
  },

  /**
   * Get policy by ID
   */
  async getById(id: string): Promise<Policy> {
    const response = await apiClient.get<Policy>(`/policies/${id}`);
    return response.data;
  },

  /**
   * Get policy with version history
   */
  async getWithVersions(id: string): Promise<PolicyWithVersions> {
    const response = await apiClient.get<PolicyWithVersions>(`/policies/${id}`);
    return response.data;
  },

  /**
   * Create new policy
   */
  async create(data: {
    title: string;
    status: string;
    reviewDate: string;
    ownerId: string;
    fileUrl?: string;
  }): Promise<Policy> {
    const response = await apiClient.post<Policy>('/policies', data);
    return response.data;
  },

  /**
   * Update policy
   */
  async update(
    id: string,
    data: Partial<{
      title: string;
      status: string;
      reviewDate: string;
      ownerId: string;
      fileUrl: string;
    }>
  ): Promise<Policy> {
    const response = await apiClient.patch<Policy>(`/policies/${id}`, data);
    return response.data;
  },

  /**
   * Publish new policy version
   */
  async publish(
    id: string,
    data: {
      versionNumber: string;
      changeDescription?: string;
      fileUrl: string;
    }
  ): Promise<Policy> {
    const response = await apiClient.post<Policy>(`/policies/${id}/publish`, data);
    return response.data;
  },

  /**
   * Map policy to standards
   */
  async mapToStandards(id: string, standardIds: string[]): Promise<void> {
    await apiClient.post(`/policies/${id}/map`, { standardIds });
  },
};
