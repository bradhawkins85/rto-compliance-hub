import apiClient from './client';
import type { LoginRequest, LoginResponse, User } from './types';

/**
 * Auth API Service
 */
export const authApi = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  /**
   * Refresh access token
   */
  async refresh(): Promise<{ user: User }> {
    const response = await apiClient.post<{ user: User }>('/auth/refresh');
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },
};
