export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  batteryLevel: number;
  profileImage?: string;
  phoneNumber?: string;
  department?: string;
  workingHours: {
    start: string;
    end: string;
  };
  joinDate: string;
  lastActive: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Paused' | 'Completed' | 'Cancelled';
  assignedTo: User;
  createdBy: User;
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  location: {
    lat: number;
    lng: number;
    radius: number;
    address?: string;
  };
  proofSubmissions: ProofSubmission[];
  timeTracking: TimeTracking;
  comments: Comment[];
  attachments: Attachment[];
  tags: string[];
  completedAt?: string;
  approvalRequired: boolean;
  isApproved: boolean;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProofSubmission {
  id: string;
  type: 'image' | 'document' | 'note';
  url?: string;
  content: string;
  submittedAt: string;
  approved: boolean;
  approvedBy?: User;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface TimeTracking {
  startTime?: string;
  endTime?: string;
  isPaused: boolean;
  pausedAt?: string;
  totalPausedTime: number;
  sessions: TimeSession[];
}

export interface TimeSession {
  startTime: string;
  endTime?: string;
  duration: number;
}

export interface Comment {
  id: string;
  user: User;
  comment: string;
  createdAt: string;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  checkIn: {
    time: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    method: 'manual' | 'auto' | 'admin';
  };
  checkOut?: {
    time: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    method: 'manual' | 'auto' | 'admin';
  };
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'half-day';
  isOvertime: boolean;
  overtimeHours: number;
}

export interface Chat {
  id: string;
  participants: User[];
  name?: string;
  type: 'direct' | 'group' | 'announcement';
  lastMessage?: {
    content: string;
    sender: User;
    timestamp: string;
  };
  isActive: boolean;
  createdBy: User;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'system';
  attachments?: Attachment[];
  readBy: {
    user: User;
    readAt: string;
  }[];
  isDeleted: boolean;
  deletedAt?: string;
  replyTo?: Message;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_updated' | 'task_completed' | 'system' | 'chat';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface BatteryData {
  level: number;
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

export interface GeofenceData {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number;
  active: boolean;
}

export interface ReportData {
  type: 'task' | 'attendance' | 'performance' | 'productivity';
  period: {
    start: string;
    end: string;
  };
  data: any;
  generatedAt: string;
}

export interface SocketEvent {
  event: string;
  data: any;
  timestamp: string;
}
