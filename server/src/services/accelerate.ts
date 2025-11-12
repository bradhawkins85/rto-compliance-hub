/**
 * Accelerate LMS API Client
 * Handles communication with the Accelerate LMS system for trainer and student data sync
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// API Configuration from environment
const ACCELERATE_API_URL = process.env.ACCELERATE_API_URL || 'https://api.acceleratelms.com/v1';
const ACCELERATE_API_KEY = process.env.ACCELERATE_API_KEY || '';
const ACCELERATE_ORGANIZATION_ID = process.env.ACCELERATE_ORGANIZATION_ID || '';

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second between requests
let lastRequestTime = 0;

// TypeScript interfaces for Accelerate API responses
export interface AccelerateTrainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  certifications?: string[];
  metadata?: Record<string, any>;
}

export interface AccelerateStudent {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  enrollmentStatus?: string;
  metadata?: Record<string, any>;
}

export interface AccelerateEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  courseName?: string;
  enrolledAt: string;
  status: string;
  completedAt?: string;
  completionStatus?: string;
  metadata?: Record<string, any>;
}

export interface AccelerateCourseCompletion {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  completedAt: string;
  status: string; // pass, fail, competent, not_competent
  grade?: number;
  metadata?: Record<string, any>;
}

export interface AcceleratePaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

/**
 * Accelerate API Client Class
 */
class AccelerateAPIClient {
  private client: AxiosInstance;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(ACCELERATE_API_KEY && ACCELERATE_ORGANIZATION_ID);
    
    this.client = axios.create({
      baseURL: ACCELERATE_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCELERATE_API_KEY}`,
        'X-Organization-ID': ACCELERATE_ORGANIZATION_ID,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data as any;
          
          if (status === 401) {
            throw new Error('Accelerate API authentication failed. Check your API key.');
          } else if (status === 403) {
            throw new Error('Accelerate API access forbidden. Check your permissions.');
          } else if (status === 429) {
            throw new Error('Accelerate API rate limit exceeded. Please try again later.');
          } else if (status >= 500) {
            throw new Error(`Accelerate API server error: ${data?.message || 'Unknown error'}`);
          }
          
          throw new Error(data?.message || `Accelerate API error: ${status}`);
        } else if (error.request) {
          throw new Error('No response from Accelerate API. Check your network connection.');
        } else {
          throw new Error(`Accelerate API client error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Rate limiting helper - ensures minimum delay between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    
    lastRequestTime = Date.now();
  }

  /**
   * Check if API is configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Test connection to Accelerate API
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Accelerate API is not configured. Set ACCELERATE_API_KEY and ACCELERATE_ORGANIZATION_ID environment variables.',
      };
    }

    try {
      await this.rateLimit();
      const response = await this.client.get('/health');
      
      return {
        success: response.status === 200,
        message: 'Successfully connected to Accelerate API',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error testing connection',
      };
    }
  }

  /**
   * Fetch all trainers from Accelerate
   */
  async fetchTrainers(page = 1, perPage = 100): Promise<AcceleratePaginatedResponse<AccelerateTrainer>> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get('/trainers', {
      params: { page, per_page: perPage },
    });

    return response.data;
  }

  /**
   * Fetch all students from Accelerate
   */
  async fetchStudents(page = 1, perPage = 100): Promise<AcceleratePaginatedResponse<AccelerateStudent>> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get('/students', {
      params: { page, per_page: perPage },
    });

    return response.data;
  }

  /**
   * Fetch enrollments from Accelerate
   */
  async fetchEnrollments(page = 1, perPage = 100, filters?: {
    studentId?: string;
    courseId?: string;
    status?: string;
  }): Promise<AcceleratePaginatedResponse<AccelerateEnrollment>> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get('/enrollments', {
      params: { 
        page, 
        per_page: perPage,
        student_id: filters?.studentId,
        course_id: filters?.courseId,
        status: filters?.status,
      },
    });

    return response.data;
  }

  /**
   * Fetch course completions from Accelerate
   */
  async fetchCompletions(page = 1, perPage = 100, filters?: {
    studentId?: string;
    courseId?: string;
    completedAfter?: string;
  }): Promise<AcceleratePaginatedResponse<AccelerateCourseCompletion>> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get('/completions', {
      params: { 
        page, 
        per_page: perPage,
        student_id: filters?.studentId,
        course_id: filters?.courseId,
        completed_after: filters?.completedAfter,
      },
    });

    return response.data;
  }

  /**
   * Fetch a single trainer by ID
   */
  async fetchTrainerById(trainerId: string): Promise<AccelerateTrainer> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get(`/trainers/${trainerId}`);
    return response.data;
  }

  /**
   * Fetch a single student by ID
   */
  async fetchStudentById(studentId: string): Promise<AccelerateStudent> {
    if (!this.isConfigured) {
      throw new Error('Accelerate API is not configured');
    }

    await this.rateLimit();
    const response = await this.client.get(`/students/${studentId}`);
    return response.data;
  }
}

// Export singleton instance
export const accelerateClient = new AccelerateAPIClient();
