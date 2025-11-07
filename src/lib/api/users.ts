import apiClient from './client';
import type {
  User,
  StaffMember,
  Credential,
  PDItem,
  PaginatedResponse,
  ListUsersParams,
} from './types';

/**
 * Users/Staff API Service
 */
export const usersApi = {
  /**
   * List users with pagination
   */
  async list(params?: ListUsersParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', {
      params,
    });
    return response.data;
  },

  /**
   * Get user by ID with credentials
   */
  async getById(id: string): Promise<StaffMember> {
    const response = await apiClient.get<StaffMember>(`/users/${id}`);
    return response.data;
  },

  /**
   * Create new user
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    department: string;
    roles: string[];
  }): Promise<User> {
    const response = await apiClient.post<User>('/users', data);
    return response.data;
  },

  /**
   * Update user
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      email: string;
      department: string;
      roles: string[];
      status: string;
    }>
  ): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Add credential to user
   */
  async addCredential(
    userId: string,
    data: {
      name: string;
      issueDate: string;
      expiryDate?: string;
      evidenceUrl?: string;
    }
  ): Promise<Credential> {
    const response = await apiClient.post<Credential>(`/users/${userId}/credentials`, data);
    return response.data;
  },

  /**
   * Get user's PD items
   */
  async getPDItems(userId: string): Promise<PDItem[]> {
    const response = await apiClient.get<PDItem[]>(`/users/${userId}/pd`);
    return response.data;
  },
};
