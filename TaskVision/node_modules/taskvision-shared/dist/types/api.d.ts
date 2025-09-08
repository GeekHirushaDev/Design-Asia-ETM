export interface LoginRequest {
    email: string;
    password: string;
}
export interface RegisterRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    department?: string;
}
export interface AuthResponse {
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        avatar?: string;
        department?: string;
    };
    token: string;
    refreshToken?: string;
}
export interface ResetPasswordRequest {
    email: string;
}
export interface ConfirmResetPasswordRequest {
    token: string;
    newPassword: string;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface CreateTaskRequest {
    title: string;
    description: string;
    priority: string;
    assignedTo: string;
    dueDate?: Date;
    estimatedDuration?: number;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
        radius?: number;
    };
    tags?: string[];
}
export interface UpdateTaskRequest {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: Date;
    estimatedDuration?: number;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
        radius?: number;
    };
    tags?: string[];
}
export interface StartTimerRequest {
    taskId: string;
    description?: string;
}
export interface StopTimerRequest {
    timeLogId: string;
    description?: string;
}
export interface CreateCommentRequest {
    taskId: string;
    content: string;
    mentions?: string[];
}
export interface UpdateCommentRequest {
    content: string;
    mentions?: string[];
}
export interface ClockInRequest {
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}
export interface ClockOutRequest {
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    notes?: string;
}
export interface SendMessageRequest {
    receiverId?: string;
    taskId?: string;
    content: string;
    type?: 'text' | 'file' | 'image';
}
export interface GenerateReportRequest {
    type: 'weekly' | 'monthly' | 'custom';
    startDate: Date;
    endDate: Date;
    filters?: {
        userIds?: string[];
        departments?: string[];
        taskStatuses?: string[];
        priorities?: string[];
    };
}
export interface LocationUpdateRequest {
    latitude: number;
    longitude: number;
    accuracy?: number;
    batteryLevel?: number;
}
export interface UpdateUserProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    department?: string;
    avatar?: string;
}
export interface UpdateUserRequest extends UpdateUserProfileRequest {
    email?: string;
    role?: string;
    isActive?: boolean;
}
export interface DashboardFiltersRequest {
    dateFrom?: Date;
    dateTo?: Date;
    userIds?: string[];
    departments?: string[];
}
export interface NotificationPreferences {
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskAssignments: boolean;
    taskUpdates: boolean;
    taskOverdue: boolean;
    chatMessages: boolean;
    attendanceReminders: boolean;
    weeklyReports: boolean;
}
export * from './index';
