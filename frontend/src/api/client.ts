/**
 * API 클라이언트
 */
import axios, { AxiosInstance } from 'axios';
import { ApiResponse } from '@types';

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

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        console.error('API Error:', error);
        throw error;
      }
    );
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    return this.client.get<any, ApiResponse<T>>(url);
  }

  async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.client.post<any, ApiResponse<T>>(url, data);
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
