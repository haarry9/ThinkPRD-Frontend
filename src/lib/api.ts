/**
 * Centralized API client for PRD Builder backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiRequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<T> {
    const {
      timeout = 30000,
      retries = 3,
      headers: customHeaders = {},
      ...fetchConfig
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    
    // For FormData, don't set Content-Type header
    const isFormData = fetchConfig.body instanceof FormData;
    const headers = isFormData 
      ? { ...customHeaders } // No Content-Type for FormData
      : { 'Content-Type': 'application/json', ...customHeaders };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Debug logging
    console.log('API Request:', {
      url,
      method: fetchConfig.method || 'GET',
      headers,
      bodyType: fetchConfig.body ? (fetchConfig.body instanceof FormData ? 'FormData' : typeof fetchConfig.body) : 'none',
      isFormData,
      baseURL: this.baseURL,
      endpoint
    });

    if (isFormData && fetchConfig.body instanceof FormData) {
      console.log('FormData contents:');
      for (let [key, value] of fetchConfig.body.entries()) {
        console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
      }
    }

    let lastError: Error;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchConfig,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          throw new ApiError(
            errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData.code
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof ApiError || attempt === retries - 1) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    config?: ApiRequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
    });
  }


}

export const api = new ApiClient();
export default api;