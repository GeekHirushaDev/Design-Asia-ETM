import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          return api(original);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  register: (userData: { name: string; email: string; password: string; role?: string }) =>
    api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

export const taskApi = {
  getTasks: (params?: any) => api.get('/tasks', { params }),
  getTask: (id: string) => api.get(`/tasks/${id}`),
  createTask: (data: any) => api.post('/tasks', data),
  updateTask: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  startTimer: (id: string) => api.post(`/tasks/${id}/time/start`),
  stopTimer: (id: string) => api.post(`/tasks/${id}/time/stop`),
  pauseTimer: (id: string) => api.post(`/tasks/${id}/time/pause`),
  resumeTimer: (id: string) => api.post(`/tasks/${id}/time/resume`),
  getProgressSummary: (params?: any) => api.get('/tasks/progress-summary', { params }),
  getCarryoverStats: (params?: any) => api.get('/tasks/carryover-stats', { params }),
  getUpcomingOverdue: () => api.get('/tasks/upcoming-overdue'),
};

export const attendanceApi = {
  clockIn: (location: { lat: number; lng: number }) =>
    api.post('/attendance/clock-in', { location }),
  clockOut: (location: { lat: number; lng: number }) =>
    api.post('/attendance/clock-out', { location }),
  getAttendance: (params?: any) => api.get('/attendance', { params }),
};

export const trackingApi = {
  sendPing: (data: { location: { lat: number; lng: number }; batteryLevel?: number; speed?: number }) =>
    api.post('/tracking/ping', data),
  getCurrentLocations: () => api.get('/tracking/current'),
  getHistory: (params?: any) => api.get('/tracking/history', { params }),
};

export const reportsApi = {
  generateWeekly: () => api.post('/reports/weekly/generate'),
  generateCustom: (config: any) => api.post('/reports/custom/generate', config),
  getJobStatus: (jobId: string) => api.get(`/reports/job/${jobId}/status`),
  download: (reportId: string) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
  getReports: () => api.get('/reports'),
};

export const commentApi = {
  getComments: (taskId: string, params?: any) => api.get(`/comments/task/${taskId}`, { params }),
  createComment: (taskId: string, data: any) => api.post(`/comments/task/${taskId}`, data),
  updateComment: (commentId: string, data: any) => api.put(`/comments/${commentId}`, data),
  deleteComment: (commentId: string) => api.delete(`/comments/${commentId}`),
};

export const notificationApi = {
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (notificationId: string) => api.delete(`/notifications/${notificationId}`),
};

export const deviceApi = {
  registerDevice: (data: any) => api.post('/devices/register', data),
  updateTelemetry: (deviceId: string, data: any) => api.put(`/devices/${deviceId}/telemetry`, data),
  getDevices: () => api.get('/devices'),
  removeDevice: (deviceId: string) => api.delete(`/devices/${deviceId}`),
};

export const geofenceApi = {
  getGeofences: (params?: any) => api.get('/geofences', { params }),
  createGeofence: (data: any) => api.post('/geofences', data),
  updateGeofence: (id: string, data: any) => api.put(`/geofences/${id}`, data),
  deleteGeofence: (id: string) => api.delete(`/geofences/${id}`),
};

export const roleApi = {
  getRoles: () => api.get('/roles'),
  createRole: (data: any) => api.post('/roles', data),
  updateRole: (id: string, data: any) => api.put(`/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
};

export const uploadApi = {
  getPresignedUrl: (data: any) => api.post('/uploads/presign', data),
  directUpload: (formData: FormData) => api.post('/uploads/direct', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDownloadUrl: (key: string) => api.get(`/uploads/download/${key}`),
  deleteFile: (key: string) => api.delete(`/uploads/${key}`),
};

export const timeTrackingApi = {
  // Timer controls
  startTracking: (data: { taskId: string; description?: string; estimatedDurationSeconds?: number }) => 
    api.post('/time-tracking/start', data),
  stopTracking: (timeLogId: string, data?: { description?: string }) => 
    api.post(`/time-tracking/stop/${timeLogId}`, data),
  stopAllActive: () => api.post('/time-tracking/stop-all'),
  getActiveTracking: () => api.get('/time-tracking/active'),

  // Manual entries
  logManualTime: (data: {
    taskId: string;
    startTime: string;
    endTime: string;
    description?: string;
    tags?: string[];
    billable?: boolean;
  }) => api.post('/time-tracking/manual', data),
  
  logBreakTime: (data: {
    startTime: string;
    endTime: string;
    breakType: 'lunch' | 'coffee' | 'meeting' | 'other';
    description?: string;
  }) => api.post('/time-tracking/break', data),

  // Data retrieval
  getTimeLogs: (params?: {
    startDate?: string;
    endDate?: string;
    taskId?: string;
    includeBreaks?: boolean;
    billableOnly?: boolean;
  }) => api.get('/time-tracking/logs', { params }),
  
  getDailySummary: (date: string) => api.get(`/time-tracking/summary/daily/${date}`),
  getWeeklySummary: (weekStart: string) => api.get(`/time-tracking/summary/weekly/${weekStart}`),
  getTaskAnalysis: (taskId: string) => api.get(`/time-tracking/task/${taskId}/analysis`),
  getUserStatistics: (days?: number) => api.get('/time-tracking/statistics', { params: { days } }),

  // CRUD operations
  updateTimeLog: (timeLogId: string, data: {
    startTime?: string;
    endTime?: string;
    description?: string;
    tags?: string[];
    billable?: boolean;
  }) => api.put(`/time-tracking/${timeLogId}`, data),
  
  deleteTimeLog: (timeLogId: string) => api.delete(`/time-tracking/${timeLogId}`),
};

export const userApi = {
  getUsers: (params?: any) => api.get('/users', { params }),
  getUser: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
};