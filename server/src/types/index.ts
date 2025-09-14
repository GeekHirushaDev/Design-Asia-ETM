import { Document } from 'mongoose';
import { Request } from 'express';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'employee';
  avatarUrl?: string;
  phone?: string;
  status: 'active' | 'inactive';
  emailVerified: boolean;
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
  assignedTeam?: string;
  assignmentType: 'individual' | 'team';
  tags: string[];
  approvals: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    by?: string;
    at?: Date;
    comment?: string;
  };
  carryoverInfo?: {
    isCarriedOver: boolean;
    originalDueDate?: Date;
    carryoverCount: number;
    carryoverHistory: Array<{
      from: Date;
      to: Date;
      reason: string;
      carriedAt: Date;
    }>;
  };
  progress?: {
    percentage: number;
    milestones: Array<{
      name: string;
      completed: boolean;
      completedAt?: Date;
    }>;
  };
  restrictions?: {
    employeeCanEdit: boolean;
    restrictedFields: string[];
    editableBy: string[];
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
  source: 'manual' | 'auto' | 'timer';
  description?: string;
  isBreak: boolean;
  breakType?: 'lunch' | 'coffee' | 'meeting' | 'other';
  isActive: boolean;
  estimatedDurationSeconds: number;
  efficiency: number;
  tags: string[];
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  device?: string;
  billable: boolean;
  createdAt: Date;
}

export interface IComment extends Document {
  _id: string;
  taskId: string;
  userId: string;
  content: string;
  commentType: 'comment' | 'approval_request' | 'approval_response' | 'status_change' | 'mention';
  parentCommentId?: string;
  attachments: {
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  }[];
  mentions: string[];
  isEdited: boolean;
  editedAt?: Date;
  approvalInfo?: {
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    requestedBy?: string;
    reviewedBy?: string;
    reviewedAt?: Date;
    reviewComments?: string;
    requiredApprovers: string[];
    approvers: {
      userId: string;
      status: 'pending' | 'approved' | 'rejected';
      reviewedAt?: Date;
      comments?: string;
    }[];
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isPrivate: boolean;
  tags: string[];
  reactions: {
    userId: string;
    type: 'like' | 'love' | 'laugh' | 'angry' | 'sad';
    createdAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
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