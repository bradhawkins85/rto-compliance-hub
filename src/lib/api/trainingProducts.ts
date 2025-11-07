import apiClient from './client';
import type {
  TrainingProduct,
  TrainingProductWithDetails,
  PaginatedResponse,
  ListTrainingProductsParams,
} from './types';

/**
 * Training Products API Service
 */
export const trainingProductsApi = {
  /**
   * List training products with pagination
   */
  async list(params?: ListTrainingProductsParams): Promise<PaginatedResponse<TrainingProduct>> {
    const response = await apiClient.get<PaginatedResponse<TrainingProduct>>('/training-products', {
      params,
    });
    return response.data;
  },

  /**
   * Get training product by ID
   */
  async getById(id: string): Promise<TrainingProductWithDetails> {
    const response = await apiClient.get<TrainingProductWithDetails>(`/training-products/${id}`);
    return response.data;
  },

  /**
   * Create new training product
   */
  async create(data: {
    code: string;
    name: string;
    status: string;
  }): Promise<TrainingProduct> {
    const response = await apiClient.post<TrainingProduct>('/training-products', data);
    return response.data;
  },

  /**
   * Update training product
   */
  async update(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      status: string;
    }>
  ): Promise<TrainingProduct> {
    const response = await apiClient.patch<TrainingProduct>(`/training-products/${id}`, data);
    return response.data;
  },

  /**
   * Link SOPs to training product
   */
  async linkSOPs(id: string, sopIds: string[]): Promise<void> {
    await apiClient.post(`/training-products/${id}/sops`, { sopIds });
  },
};
