import mongoose, { Schema } from 'mongoose';

export interface ISession extends mongoose.Document {
  _id: string;
  userId: string;
  deviceId: string;
  refreshToken: string;
  isActive: boolean;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISession>('Session', sessionSchema);