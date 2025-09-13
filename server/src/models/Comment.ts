import mongoose, { Schema } from 'mongoose';
import { IComment } from '../types/index.js';

const commentSchema = new Schema<IComment>(
  {
    taskId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    commentType: {
      type: String,
      enum: ['comment', 'approval_request', 'approval_response', 'status_change', 'mention'],
      default: 'comment',
    },
    parentCommentId: {
      type: String,
    },
    attachments: [{
      filename: { type: String, required: true },
      url: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
    }],
    mentions: [{
      type: String,
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    approvalInfo: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
      },
      requestedBy: {
        type: String,
      },
      reviewedBy: {
        type: String,
      },
      reviewedAt: {
        type: Date,
      },
      reviewComments: {
        type: String,
        maxlength: 1000,
      },
      requiredApprovers: [{
        type: String,
      }],
      approvers: [{
        userId: {
          type: String,
        },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
        },
        reviewedAt: Date,
        comments: String,
      }],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    tags: [{
      type: String,
      maxlength: 50,
    }],
    reactions: [{
      userId: {
        type: String,
      },
      type: {
        type: String,
        enum: ['like', 'love', 'laugh', 'angry', 'sad'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
commentSchema.index({ taskId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ 'mentions': 1 });
commentSchema.index({ 'approvalInfo.status': 1 });
commentSchema.index({ commentType: 1 });

export default mongoose.model<IComment>('Comment', commentSchema);