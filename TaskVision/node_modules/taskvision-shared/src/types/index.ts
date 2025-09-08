// Base interface for all entities with timestamps
export interface BaseEntity {
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// User roles in the system
export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee'
}

// Task status enum
export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed'
}

// Task priority levels
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// User interface
export interface IUser extends BaseEntity {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
}

// Location coordinates
export interface ILocation {
  latitude: number;
  longitude: number;
  address?: string;
  radius?: number; // in meters
}

// Task interface
export interface ITask extends BaseEntity {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string; // User ID
  assignedBy: string; // User ID
  dueDate?: Date;
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  location?: ILocation;
  tags?: string[];
  attachments?: string[];
  completedAt?: Date;
  startedAt?: Date;
  pausedAt?: Date;
  carriedOverFrom?: string; // Task ID if carried over from previous day
}

// Time log for tracking task time
export interface ITimeLog extends BaseEntity {
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  description?: string;
  isActive: boolean;
}

// Comment interface for tasks
export interface IComment extends BaseEntity {
  taskId: string;
  userId: string;
  content: string;
  mentions?: string[]; // User IDs mentioned in the comment
  attachments?: string[];
  editedAt?: Date;
}

// Attendance interface
export interface IAttendance extends BaseEntity {
  userId: string;
  date: Date;
  clockInTime?: Date;
  clockOutTime?: Date;
  clockInLocation?: ILocation;
  clockOutLocation?: ILocation;
  totalHours?: number;
  status: 'present' | 'absent' | 'late' | 'early_departure';
  notes?: string;
}

// Real-time tracking points for employee location
export interface ITrackingPoint extends BaseEntity {
  userId: string;
  location: ILocation;
  timestamp: Date;
  batteryLevel?: number;
  isOnline: boolean;
  accuracy?: number; // GPS accuracy in meters
}

// Notification interface
export interface INotification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: 'task_assigned' | 'task_updated' | 'task_overdue' | 'chat_message' | 'attendance' | 'system';
  relatedEntityId?: string; // Task ID, User ID, etc.
  relatedEntityType?: 'task' | 'user' | 'attendance' | 'chat';
  isRead: boolean;
  readAt?: Date;
  actionUrl?: string;
}

// Report interface
export interface IReport extends BaseEntity {
  title: string;
  type: 'weekly' | 'monthly' | 'custom';
  generatedBy: string; // User ID
  startDate: Date;
  endDate: Date;
  filters?: Record<string, any>;
  filePath?: string;
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
}

// Chat message interface
export interface IChatMessage extends BaseEntity {
  senderId: string;
  receiverId?: string; // For direct messages
  taskId?: string; // For task-specific chat rooms
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachments?: string[];
  isEdited: boolean;
  editedAt?: Date;
  readBy?: Array<{
    userId: string;
    readAt: Date;
  }>;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Pagination query parameters
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Task query filters
export interface TaskQueryFilters extends PaginationQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  assignedBy?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  tags?: string[];
}

// User query filters
export interface UserQueryFilters extends PaginationQuery {
  role?: UserRole;
  department?: string;
  isActive?: boolean;
  search?: string;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Socket.io event types
export interface SocketEvents {
  // Task events
  'task:created': (task: ITask) => void;
  'task:updated': (task: ITask) => void;
  'task:deleted': (taskId: string) => void;
  'task:status_changed': (data: { taskId: string; status: TaskStatus; userId: string }) => void;
  
  // Chat events
  'chat:message': (message: IChatMessage) => void;
  'chat:typing': (data: { userId: string; isTyping: boolean; roomId?: string }) => void;
  'chat:user_online': (userId: string) => void;
  'chat:user_offline': (userId: string) => void;
  
  // Tracking events
  'tracking:update': (trackingPoint: ITrackingPoint) => void;
  'tracking:user_location': (data: { userId: string; location: ILocation }) => void;
  
  // Attendance events
  'attendance:clock_in': (attendance: IAttendance) => void;
  'attendance:clock_out': (attendance: IAttendance) => void;
  
  // Notification events
  'notification:new': (notification: INotification) => void;
  'notification:read': (notificationId: string) => void;
  
  // Time tracking events
  'timelog:start': (timeLog: ITimeLog) => void;
  'timelog:pause': (timeLog: ITimeLog) => void;
  'timelog:resume': (timeLog: ITimeLog) => void;
  'timelog:stop': (timeLog: ITimeLog) => void;
}

// File upload interface
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Dashboard analytics data
export interface DashboardAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalEmployees: number;
  activeEmployees: number;
  avgTaskCompletionTime: number;
  productivityScore: number;
  todayAttendance: {
    present: number;
    absent: number;
    late: number;
  };
  recentActivities: Array<{
    type: string;
    message: string;
    timestamp: Date;
    userId: string;
    userName: string;
  }>;
}

// Employee performance metrics
export interface EmployeePerformance {
  userId: string;
  userName: string;
  tasksCompleted: number;
  tasksAssigned: number;
  avgCompletionTime: number;
  productivityScore: number;
  attendanceRate: number;
  onTimeRate: number;
  overdueTasks: number;
}

// Geofence check result
export interface GeofenceResult {
  isWithinGeofence: boolean;
  distance: number; // distance from center in meters
  location: ILocation;
}
