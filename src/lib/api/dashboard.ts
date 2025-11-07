import apiClient from './client';
import type { DashboardMetrics } from './types';

/**
 * Dashboard/Metrics API Service
 * Note: This endpoint doesn't exist yet in the backend,
 * so we'll compute it from existing endpoints
 */
export const dashboardApi = {
  /**
   * Get dashboard metrics
   * This is a composite call that fetches data from multiple endpoints
   */
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      // Fetch data from multiple endpoints in parallel
      const [standardsResponse, policiesResponse, usersResponse, trainingProductsResponse] = await Promise.all([
        apiClient.get('/standards', { params: { perPage: 100 } }),
        apiClient.get('/policies', { params: { perPage: 100 } }),
        apiClient.get('/users', { params: { perPage: 100 } }),
        apiClient.get('/training-products', { params: { perPage: 100 } }),
      ]);

      const standards = standardsResponse.data.data || [];
      const policies = policiesResponse.data.data || [];
      const users = usersResponse.data.data || [];
      const trainingProducts = trainingProductsResponse.data.data || [];

      // Calculate metrics
      const totalStandards = standardsResponse.data.pagination?.total || standards.length;
      
      // Count standards with mappings (assuming we need to fetch mappings)
      const mappedStandards = standards.length; // Simplified - would need actual mapping data

      // Count policies due for review (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const policiesDueReview = policies.filter((policy: any) => {
        const reviewDate = new Date(policy.reviewDate);
        return reviewDate >= now && reviewDate <= thirtyDaysFromNow;
      }).length;

      // Count credentials expiring (would need to fetch from users with credentials)
      const credentialsExpiring = 0; // Simplified

      // Count incomplete products (would need product details)
      const incompleteProducts = 0; // Simplified

      // Calculate overall compliance (simplified)
      const overallCompliance = Math.round(
        ((mappedStandards / totalStandards) * 100 + 
         (policiesDueReview === 0 ? 100 : 80)) / 2
      );

      return {
        overallCompliance,
        policiesDueReview,
        credentialsExpiring,
        incompleteProducts,
        mappedStandards,
        totalStandards,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      // Return default metrics on error
      return {
        overallCompliance: 0,
        policiesDueReview: 0,
        credentialsExpiring: 0,
        incompleteProducts: 0,
        mappedStandards: 0,
        totalStandards: 0,
      };
    }
  },
};
