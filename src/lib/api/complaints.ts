import apiClient from './client';
import type {
  Complaint,
  ComplaintTimeline,
  PaginatedResponse,
  ListComplaintsParams,
  CreateComplaintData,
  UpdateComplaintData,
  CloseComplaintData,
} from './types';

/**
 * Complaints API Service
 */
export const complaintsApi = {
  /**
   * List complaints with pagination and filters
   */
  async list(params?: ListComplaintsParams): Promise<PaginatedResponse<Complaint>> {
    const response = await apiClient.get<PaginatedResponse<Complaint>>('/complaints', {
      params,
    });
    return response.data;
  },

  /**
   * Get complaint by ID
   */
  async getById(id: string): Promise<Complaint> {
    const response = await apiClient.get<Complaint>(`/complaints/${id}`);
    return response.data;
  },

  /**
   * Create new complaint
   */
  async create(data: CreateComplaintData): Promise<Complaint> {
    const response = await apiClient.post<Complaint>('/complaints', data);
    return response.data;
  },

  /**
   * Update complaint
   */
  async update(id: string, data: UpdateComplaintData): Promise<Complaint> {
    const response = await apiClient.patch<Complaint>(`/complaints/${id}`, data);
    return response.data;
  },

  /**
   * Close complaint with resolution
   */
  async close(id: string, data: CloseComplaintData): Promise<Complaint> {
    const response = await apiClient.post<Complaint>(`/complaints/${id}/close`, data);
    return response.data;
  },

  /**
   * Escalate complaint to management
   */
  async escalate(id: string, notes?: string): Promise<Complaint> {
    const response = await apiClient.post<Complaint>(`/complaints/${id}/escalate`, { notes });
    return response.data;
  },

  /**
   * Get complaint timeline/audit trail
   */
  async getTimeline(id: string): Promise<ComplaintTimeline[]> {
    const response = await apiClient.get<ComplaintTimeline[]>(`/complaints/${id}/timeline`);
    return response.data;
  },

  /**
   * Add note to complaint
   */
  async addNote(id: string, notes: string): Promise<ComplaintTimeline> {
    const response = await apiClient.post<ComplaintTimeline>(`/complaints/${id}/notes`, { notes });
    return response.data;
  },
};
