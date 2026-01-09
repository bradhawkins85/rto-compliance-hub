const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  timeout?: number;
  _retry?: boolean;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string, timeout = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = timeout;
  }

  private buildUrl(url: string, params?: Record<string, string>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    if (!params) return fullUrl;

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });
    return urlObj.toString();
  }

  private async fetchWithTimeout(url: string, config: RequestConfig): Promise<Response> {
    const timeout = config.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async request<T>(url: string, config: RequestConfig = {}): Promise<T> {
    const { params, ...fetchConfig } = config;
    const fullUrl = this.buildUrl(url, params);

    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase() || 'GET'} ${url}`, {
        params,
        data: config.body,
      });
    }

    try {
      const response = await this.fetchWithTimeout(fullUrl, fetchConfig);

      if (import.meta.env.DEV) {
        console.log(`[API Response] ${config.method?.toUpperCase() || 'GET'} ${url}`, {
          status: response.status,
        });
      }

      if (!response.ok) {
        if (response.status === 401 && !config._retry) {
          try {
            await this.post('/auth/refresh', {}, { _retry: true });
            return this.request<T>(url, { ...config, _retry: true });
          } catch (refreshError) {
            console.error('[Token Refresh Failed]', refreshError);
            window.location.href = '/login';
            throw refreshError;
          }
        }

        const errorData = await response.json().catch(() => ({}));
        if (import.meta.env.DEV) {
          console.error('[API Response Error]', {
            url,
            status: response.status,
            data: errorData,
          });
        }
        throw { response: { status: response.status, data: errorData }, message: response.statusText };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[API Request Error]', error);
      throw error;
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as { response?: { data?: { detail?: string; title?: string } }; message?: string };
    const problemDetails = apiError.response?.data;
    if (problemDetails?.detail) {
      return problemDetails.detail;
    }
    if (problemDetails?.title) {
      return problemDetails.title;
    }
    if (apiError.message) {
      return apiError.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export default apiClient;
