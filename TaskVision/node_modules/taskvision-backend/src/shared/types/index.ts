// Shared type definitions for the application

// User roles
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee',
}

// User interface
export interface IUser {
  _id?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: UserRole | string;
  department?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Authentication Request/Response interfaces
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

// Task interfaces
export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  DONE = 'done',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ITask {
  _id?: string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  dueDate?: Date;
  assignedTo?: string | IUser;
  assignedBy: string | IUser;
  project?: string;
  comments?: IComment[];
  attachments?: IAttachment[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Comment interface
export interface IComment {
  _id?: string;
  text: string;
  author: string | IUser;
  createdAt?: Date;
  updatedAt?: Date;
}

// Attachment interface
export interface IAttachment {
  _id?: string;
  filename: string;
  originalname: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedBy: string | IUser;
  uploadedAt?: Date;
}

// Project interface
export interface IProject {
  _id?: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: string;
  manager: string | IUser;
  team: (string | IUser)[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Notification interface
export interface INotification {
  _id?: string;
  recipient: string | IUser;
  sender?: string | IUser;
  type: string;
  message: string;
  relatedTo?: {
    model: string;
    id: string;
  };
  isRead: boolean;
  createdAt?: Date;
}
