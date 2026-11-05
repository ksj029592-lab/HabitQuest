/**
 * API 클라이언트
 */
import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '@types';
import { useSessionStore } from '../store/sessionStore';

export const AI_REQUEST_TIMEOUT = 75000;

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const sessionId = useSessionStore.getState().session?.sessionId;
      if (sessionId && !sessionId.startsWith('session_')) config.headers.set('Authorization', `Bearer ${sessionId}`);
      return config;
    });

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error.response?.status || error.code);
        throw error;
      }
    );
  }

  async get<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    return this.client.get<any, ApiResponse<T>>(url, config);
  }

  async post<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    return this.client.post<any, ApiResponse<T>>(url, data, config);
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.put<any, ApiResponse<T>>(url, data);
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.patch<any, ApiResponse<T>>(url, data);
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    return this.client.delete<any, ApiResponse<T>>(url);
  }
}

export const apiClient = new ApiClient();
