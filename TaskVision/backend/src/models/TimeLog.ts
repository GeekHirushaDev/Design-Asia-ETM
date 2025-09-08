import mongoose, { Schema, Document } from 'mongoose';
import { ITimeLog } from '@shared/types';

export interface ITimeLogDocument extends ITimeLog, Document {
  calculateDuration(): number;
  stop(): Promise<ITimeLogDocument>;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     TimeLog:
 *       type: object
 *       required:
 *         - taskId
 *         - userId
 *         - startTime
 *         - isActive
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated time log ID
 *         taskId:
 *           type: string
 *           description: ID of the associated task
 *         userId:
 *           type: string
 *           description: ID of the user logging time
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: When the timer started
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: When the timer ended
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         description:
 *           type: string
 *           description: Optional description of work done
 *         isActive:
 *           type: boolean
 *           description: Whether the timer is currently running
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const timeLogSchema = new Schema<ITimeLogDocument>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required']
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      default: Date.now
    },
    endTime: {
      type: Date,
      default: null,
      validate: {
        validator: function(this: ITimeLogDocument, value: Date) {
          return !value || value >= this.startTime;
        },
        message: 'End time must be after start time'
      }
    },
    duration: {
      type: Number,
      default: null,
      min: [0, 'Duration cannot be negative']
    },
    description: {
      type: String,
      default: null,
      maxlength: [500, 'Description cannot be more than 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, 'Active status is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

// Indexes for better query performance
timeLogSchema.index({ taskId: 1, userId: 1 });
timeLogSchema.index({ userId: 1, startTime: -1 });
timeLogSchema.index({ isActive: 1 });
timeLogSchema.index({ startTime: 1, endTime: 1 });

// Virtual for calculated duration if not set
timeLogSchema.virtual('calculatedDuration').get(function(this: ITimeLogDocument) {
  if (this.duration !== null && this.duration !== undefined) {
    return this.duration;
  }
  
  if (this.endTime) {
    return Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  }
  
  if (this.isActive) {
    return Math.round((new Date().getTime() - this.startTime.getTime()) / (1000 * 60));
  }
  
  return 0;
});

// Pre-save middleware to calculate duration
timeLogSchema.pre('save', function(this: ITimeLogDocument, next) {
  // Calculate duration if endTime is set and duration is not manually set
  if (this.endTime && (this.duration === null || this.duration === undefined)) {
    this.duration = Math.round((this.endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
  }
  
  // Set isActive to false if endTime is set
  if (this.endTime && this.isActive) {
    this.isActive = false;
  }
  
  next();
});

// Method to calculate current duration
timeLogSchema.methods.calculateDuration = function(this: ITimeLogDocument): number {
  const endTime = this.endTime || new Date();
  return Math.round((endTime.getTime() - this.startTime.getTime()) / (1000 * 60));
};

// Method to stop the timer
timeLogSchema.methods.stop = async function(this: ITimeLogDocument): Promise<ITimeLogDocument> {
  if (!this.isActive) {
    throw new Error('Timer is not active');
  }
  
  this.endTime = new Date();
  this.isActive = false;
  this.duration = this.calculateDuration();
  
  return await this.save();
};

// Static method to find active timer for user
timeLogSchema.statics.findActiveByUser = function(userId: string) {
  return this.findOne({ userId, isActive: true });
};

// Static method to find active timer for task
timeLogSchema.statics.findActiveByTask = function(taskId: string) {
  return this.findOne({ taskId, isActive: true });
};

// Static method to get total time spent on task
timeLogSchema.statics.getTotalTimeForTask = async function(taskId: string): Promise<number> {
  const result = await this.aggregate([
    { $match: { taskId: new mongoose.Types.ObjectId(taskId), isActive: false } },
    { $group: { _id: null, totalDuration: { $sum: '$duration' } } }
  ]);
  
  return result.length > 0 ? result[0].totalDuration : 0;
};

// Static method to get time logs for date range
timeLogSchema.statics.findByDateRange = function(
  userId: string, 
  startDate: Date, 
  endDate: Date
) {
  return this.find({
    userId,
    startTime: { $gte: startDate, $lte: endDate }
  }).populate('taskId', 'title description priority');
};

export const TimeLog = mongoose.model<ITimeLogDocument>('TimeLog', timeLogSchema);
export default TimeLog;
