import axios, { AxiosInstance, AxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available - use Zustand storage format
        const authStorage = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            const token = parsed?.state?.token;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Handle specific error codes
          switch (error.response.status) {
            case 401:
              // Unauthorized - clear token and redirect to login
              localStorage.removeItem('auth-storage');
              window.location.href = '/auth';
              break;
            case 429:
              // Rate limit exceeded
              console.error('Rate limit exceeded');
              break;
            case 500:
              // Server error
              console.error('Server error:', error.response.data);
              break;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
