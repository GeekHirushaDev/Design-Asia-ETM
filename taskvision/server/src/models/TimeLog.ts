import mongoose, { Schema } from 'mongoose';
import { ITimeLog } from '../types/index.js';

const timeLogSchema = new Schema<ITimeLog>(
  {
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
    startTime: {
      type: Date,
      required: true,
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
      enum: ['manual', 'auto'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITimeLog>('TimeLog', timeLogSchema);