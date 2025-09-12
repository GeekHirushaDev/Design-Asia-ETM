import mongoose, { Schema } from 'mongoose';

export interface IGeofence extends mongoose.Document {
  _id: string;
  name: string;
  description?: string;
  center: {
    lat: number;
    lng: number;
  };
  radiusMeters: number;
  isActive: boolean;
  taskIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const geofenceSchema = new Schema<IGeofence>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    radiusMeters: {
      type: Number,
      required: true,
      min: 10,
      max: 10000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    taskIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Task',
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

geofenceSchema.index({ center: '2dsphere' });

export default mongoose.model<IGeofence>('Geofence', geofenceSchema);