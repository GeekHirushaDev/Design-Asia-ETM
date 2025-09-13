import mongoose, { Schema } from 'mongoose';

export interface INotification extends mongoose.Document {
  _id: string;
  userId: string;
  type: 'task_assigned' | 'task_completed' | 'task_overdue' | 'approval_required' | 'attendance_reminder' | 'comment_mention';
  title: string;
  body: string;
  read: boolean;
  readAt?: Date;
  meta?: {
    taskId?: string;
    commentId?: string;
    userId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['task_assigned', 'task_completed', 'task_overdue', 'approval_required', 'attendance_reminder', 'comment_mention'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    meta: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', notificationSchema);