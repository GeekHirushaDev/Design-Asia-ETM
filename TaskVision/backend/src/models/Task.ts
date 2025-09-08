import mongoose, { Schema, Document } from 'mongoose';
import { ITask, TaskStatus, TaskPriority, ILocation } from '@shared/types';

export interface ITaskDocument extends ITask, Document {
  calculateDuration(): number;
  isOverdue(): boolean;
  canBeEditedBy(userId: string): boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Location:
 *       type: object
 *       properties:
 *         latitude:
 *           type: number
 *           description: Latitude coordinate
 *         longitude:
 *           type: number
 *           description: Longitude coordinate
 *         address:
 *           type: string
 *           description: Human readable address
 *         radius:
 *           type: number
 *           description: Geofence radius in meters
 *     
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - status
 *         - priority
 *         - assignedTo
 *         - assignedBy
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated task ID
 *         title:
 *           type: string
 *           description: Task title
 *         description:
 *           type: string
 *           description: Detailed task description
 *         status:
 *           type: string
 *           enum: [not_started, in_progress, paused, completed]
 *           description: Current task status
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           description: Task priority level
 *         assignedTo:
 *           type: string
 *           description: ID of user assigned to the task
 *         assignedBy:
 *           type: string
 *           description: ID of user who assigned the task
 *         dueDate:
 *           type: string
 *           format: date-time
 *           description: Task due date
 *         estimatedDuration:
 *           type: number
 *           description: Estimated duration in minutes
 *         actualDuration:
 *           type: number
 *           description: Actual duration in minutes
 *         location:
 *           $ref: '#/components/schemas/Location'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Task tags
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           description: File attachment URLs
 *         completedAt:
 *           type: string
 *           format: date-time
 *           description: Task completion timestamp
 *         startedAt:
 *           type: string
 *           format: date-time
 *           description: Task start timestamp
 *         pausedAt:
 *           type: string
 *           format: date-time
 *           description: Task pause timestamp
 *         carriedOverFrom:
 *           type: string
 *           description: ID of task this was carried over from
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Location subdocument schema
const locationSchema = new Schema<ILocation>(
  {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    address: {
      type: String,
      default: null,
      maxlength: [200, 'Address cannot be more than 200 characters']
    },
    radius: {
      type: Number,
      default: 100, // 100 meters default
      min: [10, 'Radius must be at least 10 meters'],
      max: [10000, 'Radius cannot exceed 10km']
    }
  },
  { _id: false }
);

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters']
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.NOT_STARTED,
      required: [true, 'Task status is required']
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
      required: [true, 'Task priority is required']
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must be assigned to a user']
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task must have an assigner']
    },
    dueDate: {
      type: Date,
      default: null,
      validate: {
        validator: function(this: ITaskDocument, value: Date) {
          return !value || value > new Date();
        },
        message: 'Due date must be in the future'
      }
    },
    estimatedDuration: {
      type: Number,
      default: null,
      min: [1, 'Estimated duration must be at least 1 minute'],
      max: [60 * 24 * 7, 'Estimated duration cannot exceed 1 week (10080 minutes)'] // 1 week in minutes
    },
    actualDuration: {
      type: Number,
      default: null,
      min: [0, 'Actual duration cannot be negative']
    },
    location: {
      type: locationSchema,
      default: null
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 10; // Maximum 10 tags
        },
        message: 'Cannot have more than 10 tags'
      }
    },
    attachments: {
      type: [String],
      default: [],
      validate: {
        validator: function(attachments: string[]) {
          return attachments.length <= 20; // Maximum 20 attachments
        },
        message: 'Cannot have more than 20 attachments'
      }
    },
    completedAt: {
      type: Date,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    pausedAt: {
      type: Date,
      default: null
    },
    carriedOverFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function(this: ITaskDocument) {
  return this.dueDate && 
         this.status !== TaskStatus.COMPLETED && 
         new Date() > this.dueDate;
});

// Virtual for progress percentage (based on time tracking)
taskSchema.virtual('progressPercentage').get(function(this: ITaskDocument) {
  if (!this.estimatedDuration || !this.actualDuration) return 0;
  return Math.min(100, Math.round((this.actualDuration / this.estimatedDuration) * 100));
});

// Pre-save middleware to set status-specific timestamps
taskSchema.pre('save', function(this: ITaskDocument, next) {
  const now = new Date();
  
  // Set startedAt when status changes to in_progress for the first time
  if (this.isModified('status') && this.status === TaskStatus.IN_PROGRESS && !this.startedAt) {
    this.startedAt = now;
  }
  
  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === TaskStatus.COMPLETED && !this.completedAt) {
    this.completedAt = now;
  }
  
  // Set pausedAt when status changes to paused
  if (this.isModified('status') && this.status === TaskStatus.PAUSED) {
    this.pausedAt = now;
  }
  
  // Clear completedAt if status changes from completed to something else
  if (this.isModified('status') && this.status !== TaskStatus.COMPLETED && this.completedAt) {
    this.completedAt = null;
  }
  
  next();
});

// Method to calculate duration (for completed tasks)
taskSchema.methods.calculateDuration = function(this: ITaskDocument): number {
  if (this.startedAt && this.completedAt) {
    return Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60)); // minutes
  }
  return 0;
};

// Method to check if task is overdue
taskSchema.methods.isOverdue = function(this: ITaskDocument): boolean {
  return this.dueDate && 
         this.status !== TaskStatus.COMPLETED && 
         new Date() > this.dueDate;
};

// Method to check if user can edit this task
taskSchema.methods.canBeEditedBy = function(this: ITaskDocument, userId: string): boolean {
  return this.assignedTo.toString() === userId || this.assignedBy.toString() === userId;
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: TaskStatus.COMPLETED }
  });
};

// Static method to find tasks for carryover
taskSchema.statics.findForCarryover = function(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.PAUSED] }
  });
};

// Static method to find tasks by location radius
taskSchema.statics.findByLocation = function(latitude: number, longitude: number, radiusKm: number = 1) {
  return this.find({
    location: {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusKm / 6378.1] // Earth's radius in km
      }
    }
  });
};

export const Task = mongoose.model<ITaskDocument>('Task', taskSchema);
export default Task;
