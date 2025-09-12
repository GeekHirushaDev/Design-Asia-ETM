import mongoose, { Schema } from 'mongoose';
import { ITrackingPoint } from '../types/index.js';

const trackingPointSchema = new Schema<ITrackingPoint>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
    },
    speed: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

trackingPointSchema.index({ userId: 1, timestamp: -1 });

export default mongoose.model<ITrackingPoint>('TrackingPoint', trackingPointSchema);