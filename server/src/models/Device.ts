import mongoose, { Schema } from 'mongoose';

export interface IDevice extends mongoose.Document {
  _id: string;
  userId: string;
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  lastSeen: Date;
  batteryLevel?: number;
  isOnline: boolean;
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet'],
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    isOnline: {
      type: Boolean,
      default: true,
    },
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
deviceSchema.index({ lastSeen: 1 });

export default mongoose.model<IDevice>('Device', deviceSchema);