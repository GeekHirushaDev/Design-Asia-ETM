import mongoose, { Document, Schema } from 'mongoose';

export interface ILocationTracking extends Document {
  userId: mongoose.Types.ObjectId;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number; // in meters
    altitude?: number;
    heading?: number; // direction in degrees
    speed?: number; // in meters per second
  };
  batteryLevel?: number; // percentage 0-100
  batteryStatus?: 'charging' | 'discharging' | 'full' | 'low';
  deviceInfo?: {
    platform: string;
    userAgent: string;
    isOnline: boolean;
    networkType?: string;
  };
  timestamp: Date;
  source: 'gps' | 'network' | 'manual';
  isInsideGeofence?: boolean;
  activeGeofences?: mongoose.Types.ObjectId[];
  metadata?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    weather?: {
      temperature: number;
      condition: string;
      humidity: number;
    };
  };
  createdAt: Date;
}

const LocationTrackingSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0
    },
    altitude: Number,
    heading: {
      type: Number,
      min: 0,
      max: 360
    },
    speed: {
      type: Number,
      min: 0
    }
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  batteryStatus: {
    type: String,
    enum: ['charging', 'discharging', 'full', 'low']
  },
  deviceInfo: {
    platform: String,
    userAgent: String,
    isOnline: {
      type: Boolean,
      default: true
    },
    networkType: String
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['gps', 'network', 'manual'],
    required: true,
    default: 'gps'
  },
  isInsideGeofence: {
    type: Boolean,
    default: false
  },
  activeGeofences: [{
    type: Schema.Types.ObjectId,
    ref: 'Geofence'
  }],
  metadata: {
    address: String,
    city: String,
    state: String,
    country: String,
    weather: {
      temperature: Number,
      condition: String,
      humidity: Number
    }
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Compound indexes for efficient queries
LocationTrackingSchema.index({ userId: 1, timestamp: -1 });
LocationTrackingSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
LocationTrackingSchema.index({ timestamp: -1 });
LocationTrackingSchema.index({ userId: 1, isInsideGeofence: 1 });
LocationTrackingSchema.index({ activeGeofences: 1 });

// TTL index to automatically delete old location data (30 days)
LocationTrackingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const LocationTracking = mongoose.model<ILocationTracking>('LocationTracking', LocationTrackingSchema);
