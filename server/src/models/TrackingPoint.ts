import mongoose, { Schema } from 'mongoose';
import { ITrackingPoint } from '../types/index.js';
import { TimezoneUtils } from '../utils/timezone.js';

const trackingPointSchema = new Schema<ITrackingPoint>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: () => TimezoneUtils.now(),
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