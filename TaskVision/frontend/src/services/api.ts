import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

// Types
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const { logout } = useAuthStore.getState();
    
    // Handle different error status codes
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      logout();
      toast.error('Session expired. Please login again.');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden
      toast.error('You do not have permission to perform this action.');
    } else if (error.response?.status === 404) {
      // Not found
      toast.error('Resource not found.');
    } else if (error.response?.status && error.response.status >= 500) {
      // Server error
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      toast.error('Request timeout. Please check your connection.');
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your internet connection.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<ApiResponse>('/auth/login', { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
  }) => api.post<ApiResponse>('/auth/register', data),
  
  getMe: () => api.get<ApiResponse>('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<ApiResponse>('/auth/change-password', {
      currentPassword,
      newPassword,
    }),
  
  forgotPassword: (email: string) =>
    api.post<ApiResponse>('/auth/forgot-password', { email }),
  
  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiResponse>('/auth/reset-password', { token, newPassword }),
  
  logout: () => api.post<ApiResponse>('/auth/logout'),
};

// Users API
export const usersApi = {
  getUsers: (params?: any) => api.get<ApiResponse>('/users', { params }),
  getUser: (id: string) => api.get<ApiResponse>(`/users/${id}`),
  updateUser: (id: string, data: any) => api.patch<ApiResponse>(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete<ApiResponse>(`/users/${id}`),
  updateProfile: (data: any) => api.patch<ApiResponse>('/users/profile', data),
};

// Tasks API
export const tasksApi = {
  getTasks: (params?: any) => api.get<ApiResponse>('/tasks', { params }),
  getTask: (id: string) => api.get<ApiResponse>(`/tasks/${id}`),
  createTask: (data: any) => api.post<ApiResponse>('/tasks', data),
  updateTask: (id: string, data: any) => api.patch<ApiResponse>(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete<ApiResponse>(`/tasks/${id}`),
  getMyTasks: (params?: any) => api.get<ApiResponse>('/tasks/my-tasks', { params }),
};

// Time Logs API
export const timeLogsApi = {
  getTimeLogs: (params?: any) => api.get<ApiResponse>('/timelogs', { params }),
  startTimer: (taskId: string, description?: string) =>
    api.post<ApiResponse>('/timelogs/start', { taskId, description }),
  stopTimer: (timeLogId: string, description?: string) =>
    api.patch<ApiResponse>(`/timelogs/${timeLogId}/stop`, { description }),
  getActiveTimer: () => api.get<ApiResponse>('/timelogs/active'),
};

// Attendance API
export const attendanceApi = {
  getAttendance: (params?: any) => api.get<ApiResponse>('/attendance', { params }),
  clockIn: (location: { latitude: number; longitude: number; address?: string }) =>
    api.post<ApiResponse>('/attendance/clock-in', { location }),
  clockOut: (location: { latitude: number; longitude: number; address?: string }, notes?: string) =>
    api.post<ApiResponse>('/attendance/clock-out', { location, notes }),
  getTodayAttendance: () => api.get<ApiResponse>('/attendance/today'),
  getAttendanceStats: (startDate: string, endDate: string) =>
    api.get<ApiResponse>('/attendance/stats', { params: { startDate, endDate } }),
};

// Comments API
export const commentsApi = {
  getComments: (taskId: string) => api.get<ApiResponse>(`/comments/task/${taskId}`),
  createComment: (data: { taskId: string; content: string; mentions?: string[] }) =>
    api.post<ApiResponse>('/comments', data),
  updateComment: (id: string, data: { content: string; mentions?: string[] }) =>
    api.patch<ApiResponse>(`/comments/${id}`, data),
  deleteComment: (id: string) => api.delete<ApiResponse>(`/comments/${id}`),
};

// Notifications API
export const notificationsApi = {
  getNotifications: (params?: any) => api.get<ApiResponse>('/notifications', { params }),
  markAsRead: (id: string) => api.patch<ApiResponse>(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch<ApiResponse>('/notifications/mark-all-read'),
  getUnreadCount: () => api.get<ApiResponse>('/notifications/unread-count'),
};

// Reports API
export const reportsApi = {
  generateReport: (data: {
    type: 'weekly' | 'monthly' | 'custom';
    startDate: string;
    endDate: string;
    filters?: any;
  }) => api.post<ApiResponse>('/reports/generate', data),
  getReports: (params?: any) => api.get<ApiResponse>('/reports', { params }),
  downloadReport: (id: string) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

// Tracking API
export const trackingApi = {
  updateLocation: (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
  }) => api.post<ApiResponse>('/tracking/location', data),
  getLocationHistory: (userId?: string, startDate?: string, endDate?: string) =>
    api.get<ApiResponse>('/tracking/history', { params: { userId, startDate, endDate } }),
  getCurrentLocation: (userId?: string) =>
    api.get<ApiResponse>(`/tracking/current/${userId}`),
};

// Chat API
export const chatApi = {
  getMessages: (params?: any) => api.get<ApiResponse>('/chat/messages', { params }),
  sendMessage: (data: {
    receiverId?: string;
    taskId?: string;
    content: string;
    type?: 'text' | 'file' | 'image';
  }) => api.post<ApiResponse>('/chat/messages', data),
  getRooms: () => api.get<ApiResponse>('/chat/rooms'),
  markAsRead: (messageId: string) => api.patch<ApiResponse>(`/chat/messages/${messageId}/read`),
};

// File upload utility
export const uploadFile = async (file: File, endpoint: string = '/upload'): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<ApiResponse<{ url: string }>>(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.data?.url || '';
};

// Export the api instance for use in components
export { api };

// Default export
export default api;
