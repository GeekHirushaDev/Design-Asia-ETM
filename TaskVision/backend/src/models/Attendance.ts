import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  checkIn: {
    time: Date;
    location: {
      lat: number;
      lng: number;
      accuracy: number;
      address?: string;
      geofenceId?: mongoose.Types.ObjectId;
      isValidLocation: boolean;
      batteryLevel?: number;
      deviceInfo?: {
        platform: string;
        userAgent: string;
        ipAddress: string;
      };
    };
    method: 'manual' | 'auto' | 'admin' | 'geofence';
    verificationData?: {
      selfieUrl?: string;
      deviceFingerprint: string;
      isValidDevice: boolean;
    };
  };
  checkOut?: {
    time: Date;
    location: {
      lat: number;
      lng: number;
      accuracy: number;
      address?: string;
      geofenceId?: mongoose.Types.ObjectId;
      isValidLocation: boolean;
      batteryLevel?: number;
      deviceInfo?: {
        platform: string;
        userAgent: string;
        ipAddress: string;
      };
    };
    method: 'manual' | 'auto' | 'admin' | 'geofence';
    verificationData?: {
      selfieUrl?: string;
      deviceFingerprint: string;
      isValidDevice: boolean;
    };
  };
  totalHours: number;
  breaks: {
    startTime: Date;
    endTime?: Date;
    duration: number;
    reason?: string;
    location?: {
      lat: number;
      lng: number;
      address?: string;
    };
  }[];
  locationHistory?: Array<{
    latitude: number;
    longitude: number;
    timestamp: Date;
    duration: number; // minutes spent at this location
    geofenceId?: mongoose.Types.ObjectId;
    activity: 'working' | 'break' | 'travel' | 'idle';
  }>;
  geofenceViolations?: Array<{
    timestamp: Date;
    type: 'unauthorized_exit' | 'late_entry' | 'outside_working_hours';
    location: {
      lat: number;
      lng: number;
    };
    description: string;
  }>;
  status: 'present' | 'absent' | 'late' | 'half-day';
  notes?: string;
  isOvertime: boolean;
  overtimeHours: number;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

const attendanceSchema = new Schema<IAttendance>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  checkIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      },
      accuracy: {
        type: Number,
        required: true
      },
      address: String,
      geofenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Geofence'
      },
      isValidLocation: {
        type: Boolean,
        default: false
      },
      batteryLevel: Number,
      deviceInfo: {
        platform: String,
        userAgent: String,
        ipAddress: String
      }
    },
    method: {
      type: String,
      enum: ['manual', 'auto', 'admin', 'geofence'],
      default: 'manual'
    },
    verificationData: {
      selfieUrl: String,
      deviceFingerprint: {
        type: String,
        required: true
      },
      isValidDevice: {
        type: Boolean,
        default: false
      }
    }
  },
  checkOut: {
    time: Date,
    location: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      address: String,
      geofenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Geofence'
      },
      isValidLocation: {
        type: Boolean,
        default: false
      },
      batteryLevel: Number,
      deviceInfo: {
        platform: String,
        userAgent: String,
        ipAddress: String
      }
    },
    method: {
      type: String,
      enum: ['manual', 'auto', 'admin', 'geofence'],
      default: 'manual'
    },
    verificationData: {
      selfieUrl: String,
      deviceFingerprint: String,
      isValidDevice: {
        type: Boolean,
        default: false
      }
    }
  },
  totalHours: {
    type: Number,
    default: 0
  },
  breaks: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    duration: {
      type: Number,
      default: 0
    },
    reason: String,
    location: {
      lat: Number,
      lng: Number,
      address: String
    }
  }],
  locationHistory: [{
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      default: 0
    },
    geofenceId: {
      type: Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    activity: {
      type: String,
      enum: ['working', 'break', 'travel', 'idle'],
      default: 'working'
    }
  }],
  geofenceViolations: [{
    timestamp: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['unauthorized_exit', 'late_entry', 'outside_working_hours'],
      required: true
    },
    location: {
      lat: {
        type: Number,
        required: true
      },
      lng: {
        type: Number,
        required: true
      }
    },
    description: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day'],
    default: 'present'
  },
  notes: String,
  isOvertime: {
    type: Boolean,
    default: false
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ userId: 1, createdAt: -1 });
attendanceSchema.index({ 'checkIn.location.geofenceId': 1 });
attendanceSchema.index({ 'locationHistory.geofenceId': 1 });
attendanceSchema.index({ 'geofenceViolations.type': 1, 'geofenceViolations.timestamp': -1 });

// Virtual for location tracking summary
attendanceSchema.virtual('locationSummary').get(function() {
  const history = this.locationHistory || [];
  const totalTime = history.reduce((sum, loc) => sum + loc.duration, 0);
  
  const activityBreakdown = history.reduce((acc, loc) => {
    acc[loc.activity] = (acc[loc.activity] || 0) + loc.duration;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalTrackedTime: totalTime,
    activities: activityBreakdown,
    geofenceCompliance: this.geofenceViolations?.length === 0
  };
});

// Calculate total hours before saving
attendanceSchema.pre('save', function(next: any) {
  if (this.checkIn && this.checkOut) {
    const totalMs = this.checkOut.time.getTime() - this.checkIn.time.getTime();
    const breakMs = this.breaks.reduce((total: number, breakItem: any) => {
      return total + (breakItem.duration * 60 * 1000); // Convert minutes to ms
    }, 0);
    
    this.totalHours = Math.max(0, (totalMs - breakMs) / (1000 * 60 * 60)); // Convert to hours
    
    // Check for overtime (assuming 8 hours is standard)
    if (this.totalHours > 8) {
      this.isOvertime = true;
      this.overtimeHours = this.totalHours - 8;
    }
  }
  
  next();
});

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
