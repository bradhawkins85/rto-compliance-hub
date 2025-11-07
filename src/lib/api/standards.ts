import apiClient from './client';
import type {
  Standard,
  StandardMappings,
  PaginatedResponse,
  ListStandardsParams,
} from './types';

/**
 * Standards API Service
 */
export const standardsApi = {
  /**
   * List standards with pagination
   */
  async list(params?: ListStandardsParams): Promise<PaginatedResponse<Standard>> {
    const response = await apiClient.get<PaginatedResponse<Standard>>('/standards', {
      params,
    });
    return response.data;
  },

  /**
   * Get standard by ID
   */
  async getById(id: string): Promise<Standard> {
    const response = await apiClient.get<Standard>(`/standards/${id}`);
    return response.data;
  },

  /**
   * Get standard mappings (policies, SOPs, evidence)
   */
  async getMappings(id: string): Promise<StandardMappings> {
    const response = await apiClient.get<StandardMappings>(`/standards/${id}/mappings`);
    return response.data;
  },
};
