import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'inactive';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface ITask extends Document {
  _id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'paused' | 'completed';
  location?: {
    lat: number;
    lng: number;
    radiusMeters: number;
    address?: string;
  };
  estimateMinutes?: number;
  dueDate?: Date;
  createdBy: string;
  assignedTo: string[];
  tags: string[];
  approvals: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    by?: string;
    at?: Date;
    comment?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimeLog extends Document {
  _id: string;
  taskId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  source: 'manual' | 'auto';
  createdAt: Date;
}

export interface IComment extends Document {
  _id: string;
  taskId: string;
  userId: string;
  content: string;
  attachments: {
    filename: string;
    url: string;
    size: number;
  }[];
  createdAt: Date;
}

export interface IAttendance extends Document {
  _id: string;
  userId: string;
  date: Date;
  clockIn?: {
    time: Date;
    location: {
      lat: number;
      lng: number;
    };
  };
  clockOut?: {
    time: Date;
    location: {
      lat: number;
      lng: number;
    };
  };
  notes?: string;
  anomalies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrackingPoint extends Document {
  _id: string;
  userId: string;
  timestamp: Date;
  location: {
    lat: number;
    lng: number;
  };
  batteryLevel?: number;
  speed?: number;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface SocketAuthData {
  userId: string;
  role: string;
  userName: string;
}