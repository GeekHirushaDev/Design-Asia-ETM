import mongoose, { Schema, Document } from 'mongoose';
import { TimezoneUtils } from '../utils/timezone.js';

export interface ITaskStatusLog extends Document {
  _id: string;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fromStatus: string;
  toStatus: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  createdAt: Date;
}

const taskStatusLogSchema = new Schema<ITaskStatusLog>({
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fromStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'paused', 'completed'],
    required: true,
  },
  toStatus: {
    type: String,
    enum: ['not_started', 'in_progress', 'paused', 'completed'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: () => TimezoneUtils.now(),
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

taskStatusLogSchema.index({ taskId: 1, timestamp: -1 });
taskStatusLogSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<ITaskStatusLog>('TaskStatusLog', taskStatusLogSchema);