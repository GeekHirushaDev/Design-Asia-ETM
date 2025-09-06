import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeEntry extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number; // in milliseconds
  description?: string;
  isActive: boolean;
  pausedDuration: number; // in milliseconds
  pauseStartTime?: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>({
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
    default: Date.now,
  },
  endTime: Date,
  duration: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  pausedDuration: {
    type: Number,
    default: 0,
  },
  pauseStartTime: Date,
}, {
  timestamps: true,
});

// Indexes
timeEntrySchema.index({ taskId: 1, userId: 1 });
timeEntrySchema.index({ userId: 1, createdAt: -1 });
timeEntrySchema.index({ startTime: 1, endTime: 1 });

// Calculate duration before saving
timeEntrySchema.pre('save', function(next: any) {
  if (this.endTime && this.startTime) {
    const totalMs = this.endTime.getTime() - this.startTime.getTime();
    this.duration = Math.max(0, totalMs - this.pausedDuration);
  }
  next();
});

export const TimeEntry = mongoose.model<ITimeEntry>('TimeEntry', timeEntrySchema);

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  name?: string;
  type: 'direct' | 'group' | 'announcement';
  lastMessage?: {
    content: string;
    sender: mongoose.Types.ObjectId;
    timestamp: Date;
  };
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const chatSchema = new Schema<IChat>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  name: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  type: {
    type: String,
    enum: ['direct', 'group', 'announcement'],
    default: 'direct',
  },
  lastMessage: {
    content: {
      type: String,
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ type: 1, isActive: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'location' | 'system';
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  readBy: {
    user: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  editHistory?: {
    content: string;
    editedAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt?: Date;
  replyTo?: mongoose.Types.ObjectId;
}

const messageSchema = new Schema<IMessage>({
  chatId: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'system'],
    default: 'text',
  },
  attachments: [{
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  }],
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  editHistory: [{
    content: {
      type: String,
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true,
});

// Indexes
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ isDeleted: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
