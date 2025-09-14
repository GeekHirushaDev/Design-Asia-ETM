import mongoose, { Schema, Document } from 'mongoose';
import { TimezoneUtils } from '../utils/timezone.js';
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
    assignedTeam: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    assignmentType: {
      type: String,
      enum: ['individual', 'team'],
      default: 'individual',
    },
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
    carryoverInfo: {
      isCarriedOver: { type: Boolean, default: false },
      originalDueDate: { type: Date },
      carryoverCount: { type: Number, default: 0 },
      carryoverHistory: [{
        from: { type: Date },
        to: { type: Date },
        reason: { type: String, default: 'Auto carryover - task not completed' },
        carriedAt: { type: Date, default: () => TimezoneUtils.now() }
      }]
    },
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      milestones: [{
        name: { type: String },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date }
      }]
    },
    restrictions: {
      employeeCanEdit: { type: Boolean, default: true },
      restrictedFields: [{ type: String }],
      editableBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>('Task', taskSchema);