export interface BaseEntity {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export declare enum UserRole {
    ADMIN = "admin",
    EMPLOYEE = "employee"
}
export declare enum TaskStatus {
    NOT_STARTED = "not_started",
    IN_PROGRESS = "in_progress",
    PAUSED = "paused",
    COMPLETED = "completed"
}
export declare enum TaskPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
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
export interface ILocation {
    latitude: number;
    longitude: number;
    address?: string;
    radius?: number;
}
export interface ITask extends BaseEntity {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: string;
    assignedBy: string;
    dueDate?: Date;
    estimatedDuration?: number;
    actualDuration?: number;
    location?: ILocation;
    tags?: string[];
    attachments?: string[];
    completedAt?: Date;
    startedAt?: Date;
    pausedAt?: Date;
    carriedOverFrom?: string;
}
export interface ITimeLog extends BaseEntity {
    taskId: string;
    userId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    description?: string;
    isActive: boolean;
}
export interface IComment extends BaseEntity {
    taskId: string;
    userId: string;
    content: string;
    mentions?: string[];
    attachments?: string[];
    editedAt?: Date;
}
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
export interface ITrackingPoint extends BaseEntity {
    userId: string;
    location: ILocation;
    timestamp: Date;
    batteryLevel?: number;
    isOnline: boolean;
    accuracy?: number;
}
export interface INotification extends BaseEntity {
    userId: string;
    title: string;
    message: string;
    type: 'task_assigned' | 'task_updated' | 'task_overdue' | 'chat_message' | 'attendance' | 'system';
    relatedEntityId?: string;
    relatedEntityType?: 'task' | 'user' | 'attendance' | 'chat';
    isRead: boolean;
    readAt?: Date;
    actionUrl?: string;
}
export interface IReport extends BaseEntity {
    title: string;
    type: 'weekly' | 'monthly' | 'custom';
    generatedBy: string;
    startDate: Date;
    endDate: Date;
    filters?: Record<string, any>;
    filePath?: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
}
export interface IChatMessage extends BaseEntity {
    senderId: string;
    receiverId?: string;
    taskId?: string;
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
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}
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
export interface UserQueryFilters extends PaginationQuery {
    role?: UserRole;
    department?: string;
    isActive?: boolean;
    search?: string;
}
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface SocketEvents {
    'task:created': (task: ITask) => void;
    'task:updated': (task: ITask) => void;
    'task:deleted': (taskId: string) => void;
    'task:status_changed': (data: {
        taskId: string;
        status: TaskStatus;
        userId: string;
    }) => void;
    'chat:message': (message: IChatMessage) => void;
    'chat:typing': (data: {
        userId: string;
        isTyping: boolean;
        roomId?: string;
    }) => void;
    'chat:user_online': (userId: string) => void;
    'chat:user_offline': (userId: string) => void;
    'tracking:update': (trackingPoint: ITrackingPoint) => void;
    'tracking:user_location': (data: {
        userId: string;
        location: ILocation;
    }) => void;
    'attendance:clock_in': (attendance: IAttendance) => void;
    'attendance:clock_out': (attendance: IAttendance) => void;
    'notification:new': (notification: INotification) => void;
    'notification:read': (notificationId: string) => void;
    'timelog:start': (timeLog: ITimeLog) => void;
    'timelog:pause': (timeLog: ITimeLog) => void;
    'timelog:resume': (timeLog: ITimeLog) => void;
    'timelog:stop': (timeLog: ITimeLog) => void;
}
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
export interface GeofenceResult {
    isWithinGeofence: boolean;
    distance: number;
    location: ILocation;
}
