import mongoose, { Schema } from 'mongoose';
import { IComment } from '../types/index.js';

const commentSchema = new Schema<IComment>(
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
    content: {
      type: String,
      required: true,
    },
    attachments: [{
      filename: { type: String, required: true },
      url: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
    }],
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ taskId: 1, createdAt: -1 });

export default mongoose.model<IComment>('Comment', commentSchema);