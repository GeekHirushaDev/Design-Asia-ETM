import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Paused' | 'Completed' | 'Cancelled';
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  dueDate: Date;
  estimatedHours: number;
  actualHours: number;
  location: {
    lat: number;
    lng: number;
    radius: number;
    address?: string;
    geofenceId?: mongoose.Types.ObjectId;
    isLocationRequired: boolean;
    validationStrict: boolean; // If true, must be within radius to complete
    allowedTimeBuffer: number; // Minutes before/after due time for location flexibility
  };
  locationValidation?: {
    completionLocation: {
      lat: number;
      lng: number;
      accuracy: number;
      timestamp: Date;
      address?: string;
    };
    isValidLocation: boolean;
    distanceFromRequired: number; // meters
    validationMethod: 'gps' | 'geofence' | 'manual_override';
    validatedBy?: mongoose.Types.ObjectId;
    validatedAt?: Date;
  };
  proofSubmissions: {
    type: 'image' | 'document' | 'note';
    url?: string;
    content: string;
    submittedAt: Date;
    approved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    rejectionReason?: string;
    location?: {
      lat: number;
      lng: number;
      timestamp: Date;
    };
  }[];
  timeTracking: {
    startTime?: Date;
    endTime?: Date;
    isPaused: boolean;
    pausedAt?: Date;
    totalPausedTime: number;
    sessions: {
      startTime: Date;
      endTime?: Date;
      duration: number;
    }[];
  };
  comments: {
    user: mongoose.Types.ObjectId;
    comment: string;
    createdAt: Date;
  }[];
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
  }[];
  tags: string[];
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
  };
  parentTask?: mongoose.Types.ObjectId;
  subTasks: mongoose.Types.ObjectId[];
  completedAt?: Date;
  approvalRequired: boolean;
  isApproved: boolean;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

const taskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Paused', 'Completed', 'Cancelled'],
    default: 'Not Started',
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  estimatedHours: {
    type: Number,
    required: true,
    min: 0,
  },
  actualHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  location: {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    radius: {
      type: Number,
      default: 100, // meters
    },
    address: {
      type: String,
      trim: true,
    },
    geofenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    isLocationRequired: {
      type: Boolean,
      default: true
    },
    validationStrict: {
      type: Boolean,
      default: false
    },
    allowedTimeBuffer: {
      type: Number,
      default: 30 // minutes
    }
  },
  locationValidation: {
    completionLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      timestamp: Date,
      address: String
    },
    isValidLocation: {
      type: Boolean,
      default: false
    },
    distanceFromRequired: {
      type: Number,
      default: 0
    },
    validationMethod: {
      type: String,
      enum: ['gps', 'geofence', 'manual_override'],
      default: 'gps'
    },
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    validatedAt: Date
  },
  proofSubmissions: [{
    type: {
      type: String,
      enum: ['image', 'document', 'note'],
      required: true,
    },
    url: String,
    content: {
      type: String,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    location: {
      lat: Number,
      lng: Number,
      timestamp: Date
    }
  }],
  timeTracking: {
    startTime: Date,
    endTime: Date,
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedAt: Date,
    totalPausedTime: {
      type: Number,
      default: 0, // in milliseconds
    },
    sessions: [{
      startTime: {
        type: Date,
        required: true,
      },
      endTime: Date,
      duration: {
        type: Number,
        default: 0, // in milliseconds
      },
    }],
  },
  comments: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  attachments: [{
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    interval: {
      type: Number,
      min: 1,
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6,
    }],
  },
  parentTask: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
  },
  subTasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  completedAt: Date,
  approvalRequired: {
    type: Boolean,
    default: false,
  },
  isApproved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
}, {
  timestamps: true,
});

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ 'location.lat': 1, 'location.lng': 1 });
taskSchema.index({ priority: 1, status: 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for calculating current duration
taskSchema.virtual('currentDuration').get(function() {
  if (!this.timeTracking.startTime) return 0;
  
  const endTime = this.timeTracking.endTime || new Date();
  const duration = endTime.getTime() - this.timeTracking.startTime.getTime();
  return Math.max(0, duration - this.timeTracking.totalPausedTime);
});

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate < new Date() && this.status !== 'Completed';
});

// Pre-save middleware
taskSchema.pre('save', function(next) {
  // Update actualHours based on timeTracking
  if (this.timeTracking.sessions && this.timeTracking.sessions.length > 0) {
    const totalMs = this.timeTracking.sessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);
    this.actualHours = totalMs / (1000 * 60 * 60); // Convert to hours
  }
  
  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

export const Task = mongoose.model<ITask>('Task', taskSchema);
