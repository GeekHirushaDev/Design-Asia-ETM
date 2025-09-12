import mongoose, { Schema } from 'mongoose';
import { ITask } from '../types/index.js';

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'paused', 'completed'],
      default: 'not_started',
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      radiusMeters: { type: Number, default: 100 },
      address: { type: String },
    },
    estimateMinutes: {
      type: Number,
    },
    dueDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    tags: [String],
    approvals: {
      required: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      by: { type: Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
      comment: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>('Task', taskSchema);