import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              });

              const { token: newToken, refreshToken: newRefreshToken } = response.data.data;
              localStorage.setItem('token', newToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete(url);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  // File upload
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// API endpoints
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    phoneNumber?: string;
    department?: string;
  }) => apiClient.post('/auth/register', userData),
  
  getMe: () => apiClient.get('/auth/me'),
  
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  
  updateLocation: (locationData: {
    lat: number;
    lng: number;
    address?: string;
    batteryLevel?: number;
  }) => apiClient.put('/auth/location', locationData),
  
  changePassword: (passwordData: {
    currentPassword: string;
    newPassword: string;
  }) => apiClient.put('/auth/password', passwordData),
  
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, password: string) =>
    apiClient.put(`/auth/reset-password/${token}`, { password }),
  
  refreshToken: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }),
};

export const taskApi = {
  getTasks: (params?: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => apiClient.get('/tasks', params),
  
  getTask: (id: string) => apiClient.get(`/tasks/${id}`),
  
  createTask: (taskData: any) => apiClient.post('/tasks', taskData),
  
  updateTask: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
  
  deleteTask: (id: string) => apiClient.delete(`/tasks/${id}`),
  
  startTask: (id: string, locationData?: { lat: number; lng: number }) =>
    apiClient.post(`/tasks/${id}/start`, locationData),
  
  pauseTask: (id: string) => apiClient.post(`/tasks/${id}/pause`),
  
  resumeTask: (id: string) => apiClient.post(`/tasks/${id}/resume`),
  
  stopTask: (id: string) => apiClient.post(`/tasks/${id}/stop`),
  
  completeTask: (id: string) => apiClient.post(`/tasks/${id}/complete`),
  
  submitProof: (id: string, proofData: {
    type: string;
    content: string;
    url?: string;
  }) => apiClient.post(`/tasks/${id}/proof`, proofData),
  
  reviewProof: (taskId: string, proofId: string, reviewData: {
    approved: boolean;
    rejectionReason?: string;
  }) => apiClient.put(`/tasks/${taskId}/proof/${proofId}`, reviewData),
  
  addComment: (id: string, comment: string) =>
    apiClient.post(`/tasks/${id}/comments`, { comment }),
  
  uploadFile: (id: string, file: File, onProgress?: (progress: number) => void) =>
    apiClient.uploadFile(`/tasks/${id}/upload`, file, onProgress),
};

export const userApi = {
  getUsers: (params?: any) => apiClient.get('/users', params),
  
  getUser: (id: string) => apiClient.get(`/users/${id}`),
  
  updateUser: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
};

export const attendanceApi = {
  getAttendance: (params?: any) => apiClient.get('/attendance', params),
  
  checkIn: (locationData: {
    lat: number;
    lng: number;
    address?: string;
  }) => apiClient.post('/attendance/checkin', locationData),
  
  checkOut: (locationData: {
    lat: number;
    lng: number;
    address?: string;
  }) => apiClient.post('/attendance/checkout', locationData),
};

export const chatApi = {
  getChats: () => apiClient.get('/chats'),
  
  getChat: (id: string) => apiClient.get(`/chats/${id}`),
  
  createChat: (data: any) => apiClient.post('/chats', data),
  
  getMessages: (chatId: string, page?: number) =>
    apiClient.get(`/chats/${chatId}/messages`, { page }),
  
  sendMessage: (chatId: string, messageData: any) =>
    apiClient.post(`/chats/${chatId}/messages`, messageData),
};

export const reportsApi = {
  getTaskReport: (params: any) => apiClient.get('/reports/tasks', params),
  
  getAttendanceReport: (params: any) => apiClient.get('/reports/attendance', params),
  
  getPerformanceReport: (params: any) => apiClient.get('/reports/performance', params),
  
  exportReport: (type: string, params: any) =>
    apiClient.get(`/reports/${type}/export`, params),
};
