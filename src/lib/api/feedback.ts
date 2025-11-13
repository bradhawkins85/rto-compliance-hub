import apiClient from './client';
import type {
  Feedback,
  FeedbackInsights,
  AICostStats,
  FeedbackTrend,
  EmergingThemesResponse,
  PaginatedResponse,
  ListFeedbackParams,
  FeedbackInsightsParams,
} from './types';

/**
 * Feedback API Service
 */
export const feedbackApi = {
  /**
   * List feedback with pagination and filters
   */
  async list(params?: ListFeedbackParams): Promise<PaginatedResponse<Feedback>> {
    const response = await apiClient.get<PaginatedResponse<Feedback>>('/feedback', {
      params,
    });
    return response.data;
  },

  /**
   * Get feedback by ID
   */
  async getById(id: string): Promise<Feedback> {
    const response = await apiClient.get<Feedback>(`/feedback/${id}`);
    return response.data;
  },

  /**
   * Create manual feedback entry
   */
  async create(data: {
    type: 'learner' | 'employer' | 'industry';
    trainingProductId?: string;
    trainerId?: string;
    courseId?: string;
    rating?: number;
    comments?: string;
    anonymous?: boolean;
  }): Promise<Feedback> {
    const response = await apiClient.post<Feedback>('/feedback', data);
    return response.data;
  },

  /**
   * Update feedback
   */
  async update(
    id: string,
    data: Partial<{
      rating: number;
      comments: string;
      sentiment: number;
      themes: string[];
    }>
  ): Promise<Feedback> {
    const response = await apiClient.patch<Feedback>(`/feedback/${id}`, data);
    return response.data;
  },

  /**
   * Delete feedback
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/feedback/${id}`);
  },

  /**
   * Get AI-generated insights
   */
  async getInsights(params?: FeedbackInsightsParams): Promise<FeedbackInsights> {
    const response = await apiClient.get<FeedbackInsights>('/feedback/insights', {
      params,
    });
    return response.data;
  },

  /**
   * Get sentiment trends over time
   */
  async getTrends(params?: {
    type?: string;
    trainingProductId?: string;
    trainerId?: string;
  }): Promise<FeedbackTrend> {
    const response = await apiClient.get<FeedbackTrend>('/feedback/trends', {
      params,
    });
    return response.data;
  },

  /**
   * Get emerging themes analysis
   */
  async getEmergingThemes(days?: number): Promise<EmergingThemesResponse> {
    const response = await apiClient.get<EmergingThemesResponse>('/feedback/emerging-themes', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Get AI cost statistics
   */
  async getAICostStats(): Promise<AICostStats> {
    const response = await apiClient.get<AICostStats>('/feedback/ai-cost');
    return response.data;
  },

  /**
   * Export feedback as CSV
   */
  async exportCSV(params?: ListFeedbackParams): Promise<Blob> {
    const response = await apiClient.get('/feedback/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
};
