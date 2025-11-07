// Export API client
export { default as apiClient, getApiErrorMessage } from './client';

// Export API services
export { authApi } from './auth';
export { standardsApi } from './standards';
export { policiesApi } from './policies';
export { trainingProductsApi } from './trainingProducts';
export { usersApi } from './users';
export { dashboardApi } from './dashboard';

// Export types
export type * from './types';
