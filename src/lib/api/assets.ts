import apiClient from './client';
import type {
  Asset,
  AssetWithHistory,
  AssetService,
  PaginatedResponse,
  ListAssetsParams,
  CreateAssetData,
  UpdateAssetData,
  LogServiceData,
  TransitionStateData,
} from './types';

/**
 * Assets API Service
 */
export const assetsApi = {
  /**
   * List assets with pagination
   */
  async list(params?: ListAssetsParams): Promise<PaginatedResponse<Asset>> {
    const response = await apiClient.get<PaginatedResponse<Asset>>('/assets', {
      params,
    });
    return response.data;
  },

  /**
   * Get asset by ID with service history
   */
  async getById(id: string): Promise<AssetWithHistory> {
    const response = await apiClient.get<AssetWithHistory>(`/assets/${id}`);
    return response.data;
  },

  /**
   * Get asset service history
   */
  async getHistory(id: string): Promise<{ assetId: string; services: AssetService[] }> {
    const response = await apiClient.get<{ assetId: string; services: AssetService[] }>(
      `/assets/${id}/history`
    );
    return response.data;
  },

  /**
   * Create new asset
   */
  async create(data: CreateAssetData): Promise<Asset> {
    const response = await apiClient.post<Asset>('/assets', data);
    return response.data;
  },

  /**
   * Update asset
   */
  async update(id: string, data: UpdateAssetData): Promise<Asset> {
    const response = await apiClient.patch<Asset>(`/assets/${id}`, data);
    return response.data;
  },

  /**
   * Log service event for asset
   */
  async logService(id: string, data: LogServiceData): Promise<AssetService> {
    const response = await apiClient.post<AssetService>(`/assets/${id}/service`, data);
    return response.data;
  },

  /**
   * Transition asset lifecycle state
   */
  async transitionState(id: string, data: TransitionStateData): Promise<Asset> {
    const response = await apiClient.post<Asset>(`/assets/${id}/state`, data);
    return response.data;
  },

  /**
   * Delete (retire) asset
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/assets/${id}`);
  },
};
