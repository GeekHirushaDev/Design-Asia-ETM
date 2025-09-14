import mongoose, { Schema } from 'mongoose';
import { TimezoneUtils } from '../utils/timezone.js';
import { ITimeLog } from '../types/index.js';

const timeLogSchema = new Schema<ITimeLog>(
  {
    taskId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: () => TimezoneUtils.now(),
    },
    endTime: {
      type: Date,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['manual', 'auto', 'timer'],
      default: 'manual',
    },
    description: {
      type: String,
      maxlength: 500,
    },
    isBreak: {
      type: Boolean,
      default: false,
    },
    breakType: {
      type: String,
      enum: ['lunch', 'coffee', 'meeting', 'other'],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    estimatedDurationSeconds: {
      type: Number,
      default: 0,
    },
    efficiency: {
      type: Number,
      default: 0,
    },
    tags: [{
      type: String,
      maxlength: 50,
    }],
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    device: {
      type: String,
      maxlength: 100,
    },
    billable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
timeLogSchema.index({ userId: 1, startTime: -1 });
timeLogSchema.index({ taskId: 1, startTime: -1 });
timeLogSchema.index({ isActive: 1 });

// Pre-save middleware to calculate duration and efficiency
timeLogSchema.pre('save', function(this: ITimeLog, next) {
  if (this.endTime && this.startTime) {
    this.durationSeconds = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
    
    if (this.estimatedDurationSeconds > 0) {
      this.efficiency = (this.estimatedDurationSeconds / this.durationSeconds) * 100;
    }
  }
  next();
});

export default mongoose.model<ITimeLog>('TimeLog', timeLogSchema);