// API types for request/response objects
import { IUser, UserRole } from '.';

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

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  department?: string;
}

export interface AuthResponse {
  user: UserResponse;
  token: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  password: string;
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Task-related API types
export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
  project?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
  project?: string;
}

export interface TaskListFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
  project?: string;
  dueDate?: string;
  search?: string;
}

// Project API types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  manager?: string;
  team?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  manager?: string;
  team?: string[];
}

// Comment API types
export interface CreateCommentRequest {
  text: string;
  taskId: string;
}

// Pagination and Response types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    field?: string;
    details?: any;
  };
}
