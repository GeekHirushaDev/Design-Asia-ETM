import mongoose, { Document, Schema } from 'mongoose';

export interface IGeofence extends Document {
  name: string;
  description?: string;
  type: 'circular' | 'polygon';
  center?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // in meters for circular geofences
  coordinates?: Array<{
    latitude: number;
    longitude: number;
  }>; // for polygon geofences
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  assignedTasks?: mongoose.Types.ObjectId[];
  autoAssignTasks: boolean;
  allowedUsers?: mongoose.Types.ObjectId[];
  workingHours?: {
    start: string; // "09:00"
    end: string;   // "17:00"
    timezone: string;
  };
  metadata?: {
    address: string;
    city: string;
    state: string;
    country: string;
    category: 'office' | 'warehouse' | 'client_site' | 'remote' | 'other';
  };
  createdAt: Date;
  updatedAt: Date;
}

const GeofenceSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['circular', 'polygon'],
    required: true
  },
  center: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  radius: {
    type: Number,
    min: 1,
    max: 10000 // max 10km radius
  },
  coordinates: [{
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
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  autoAssignTasks: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  workingHours: {
    start: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    end: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  metadata: {
    address: String,
    city: String,
    state: String,
    country: String,
    category: {
      type: String,
      enum: ['office', 'warehouse', 'client_site', 'remote', 'other'],
      default: 'other'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient geospatial queries
GeofenceSchema.index({ 'center.latitude': 1, 'center.longitude': 1 });
GeofenceSchema.index({ isActive: 1 });
GeofenceSchema.index({ createdBy: 1 });
GeofenceSchema.index({ autoAssignTasks: 1 });

// Validation to ensure either center+radius OR coordinates are provided
GeofenceSchema.pre('save', function(next) {
  if (this.type === 'circular') {
    if (!this.center || !this.radius) {
      return next(new Error('Circular geofence requires center coordinates and radius'));
    }
  } else if (this.type === 'polygon') {
    if (!this.coordinates || this.coordinates.length < 3) {
      return next(new Error('Polygon geofence requires at least 3 coordinate points'));
    }
  }
  next();
});

export const Geofence = mongoose.model<IGeofence>('Geofence', GeofenceSchema);
