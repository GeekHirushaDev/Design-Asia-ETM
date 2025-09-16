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
  login: (credentials: { login: string; password: string }) =>
    api.post('/auth/login', credentials),
  changePasswordInitial: (data: { login: string; oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password-initial', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  register: (userData: { prefix: string; firstName: string; lastName: string; username: string; email: string; mobile: string; password: string; role?: string }) =>
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
  updateStatus: (id: string, newStatus: string, location?: { latitude: number; longitude: number; address?: string }, notes?: string) => 
    api.post(`/tasks/${id}/status`, { newStatus, location, notes }),
  getStatusHistory: (id: string) => api.get(`/tasks/${id}/status-history`),
  getAnalytics: (id: string, userId: string) => api.get(`/tasks/${id}/analytics?userId=${userId}`),
  getProgressSummary: (params?: any) => api.get('/tasks/progress-summary', { params }),
  getCarryoverStats: (params?: any) => api.get('/tasks/carryover-stats', { params }),
  getUpcomingOverdue: () => api.get('/tasks/upcoming-overdue'),
  // Time tracking methods
  startTimeTracking: (id: string) => api.post(`/tasks/${id}/time/start`),
  pauseTimeTracking: (id: string) => api.post(`/tasks/${id}/time/pause`),
  stopTimeTracking: (id: string) => api.post(`/tasks/${id}/time/stop`),
  getActiveTimeLog: (id: string) => api.get(`/tasks/${id}/time/active`),
  getTaskTimeStats: (id: string) => api.get(`/tasks/${id}/time/stats`),
};

export const attendanceApi = {
  clockIn: (location: { lat: number; lng: number }) =>
    api.post('/attendance/clock-in', location),
  clockOut: (location: { lat: number; lng: number }) =>
    api.post('/attendance/clock-out', location),
  getAttendance: (params?: any) => api.get('/attendance', { params }),
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get('/attendance', { 
      params: { 
        startDate: today, 
        endDate: today,
        limit: 50 
      } 
    });
  },
  getAttendanceSummary: (params?: any) => api.get('/attendance/summary', { params }),
  updateAttendance: (id: string, data: any) => api.put(`/attendance/${id}`, data),
  deleteAttendance: (id: string) => api.delete(`/attendance/${id}`),
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
  getRoles: (params?: any) => api.get('/roles', { params }),
  createRole: (data: any) => api.post('/roles', data),
  updateRole: (id: string, data: any) => api.put(`/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/roles/${id}`),
  getPermissions: () => api.get('/roles/permissions'),
  deletePermission: (id: string) => api.delete(`/roles/permissions/${id}`),
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
  createUser: (data: any) => api.post('/users', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, data: { newPassword: string }) => api.post(`/users/${id}/reset-password`, data),
};

export const teamApi = {
  getTeams: (params?: any) => api.get('/teams', { params }),
  getTeam: (id: string) => api.get(`/teams/${id}`),
  createTeam: (data: any) => api.post('/teams', data),
  updateTeam: (id: string, data: any) => api.put(`/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/teams/${id}`),
  addMember: (teamId: string, userId: string) => api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, userId: string) => api.delete(`/teams/${teamId}/members/${userId}`),
};

export const locationApi = {
  getLocations: (params?: any) => api.get('/locations', { params }),
  getLocation: (id: string) => api.get(`/locations/${id}`),
  createLocation: (data: any) => api.post('/locations', data),
  updateLocation: (id: string, data: any) => api.put(`/locations/${id}`, data),
  deleteLocation: (id: string) => api.delete(`/locations/${id}`),
  validateLocation: (data: { locationId: string; userLatitude: number; userLongitude: number }) =>
    api.post('/locations/validate', data),
};

export const attachmentApi = {
  uploadTaskAttachments: (taskId: string, files: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    return api.post(`/uploads/task-attachments/${taskId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadTaskAttachment: (taskId: string, filename: string) =>
    api.get(`/uploads/task-attachments/${taskId}/${filename}`),
  deleteTaskAttachment: (taskId: string, filename: string) =>
    api.delete(`/uploads/task-attachments/${taskId}/${filename}`),
};