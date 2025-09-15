import mongoose, { Schema } from 'mongoose';
import { TimezoneUtils } from '../utils/timezone.js';

export interface ILocation extends mongoose.Document {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    radiusMeters: {
      type: Number,
      required: true,
      default: 100,
      min: 10,
      max: 10000,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient geospatial queries
locationSchema.index({ latitude: 1, longitude: 1 });
// name already has a unique index via schema; remove redundant secondary index to avoid duplicate index warning
// locationSchema.index({ name: 1 });
locationSchema.index({ isActive: 1 });

export default mongoose.model<ILocation>('Location', locationSchema);