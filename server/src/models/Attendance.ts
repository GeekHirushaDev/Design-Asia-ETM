import mongoose, { Schema } from 'mongoose';
import { IAttendance } from '../types/index.js';
import { TimezoneUtils } from '../utils/timezone.js';

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    clockIn: {
      time: { 
        type: Date,
        default: null,
      },
      location: {
        lat: { 
          type: Number,
          required: function(this: any) { return this.clockIn?.time; }
        },
        lng: { 
          type: Number,
          required: function(this: any) { return this.clockIn?.time; }
        },
      },
    },
    clockOut: {
      time: { 
        type: Date,
        default: null,
      },
      location: {
        lat: { 
          type: Number,
          required: function(this: any) { return this.clockOut?.time; }
        },
        lng: { 
          type: Number,
          required: function(this: any) { return this.clockOut?.time; }
        },
      },
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    anomalies: [{
      type: String,
      enum: ['late_clock_in', 'early_clock_out', 'missing_clock_out', 'location_anomaly', 'duplicate_entry'],
    }],
    totalHours: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'partial', 'pending'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate entries for same user and date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Additional indexes for efficient queries
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ 'clockIn.time': 1 });
attendanceSchema.index({ 'clockOut.time': 1 });

// Pre-save middleware to calculate total hours and status
attendanceSchema.pre('save', function(this: IAttendance, next) {
  // Calculate total hours
  if (this.clockIn?.time && this.clockOut?.time) {
    const clockIn = new Date(this.clockIn.time);
    const clockOut = new Date(this.clockOut.time);
    const diffMs = clockOut.getTime() - clockIn.getTime();
    this.totalHours = Math.round(diffMs / (1000 * 60 * 60) * 100) / 100;
  } else {
    this.totalHours = 0;
  }

  // Determine status
  if (this.clockIn && this.clockOut) {
    this.status = 'present';
  } else if (this.clockIn && !this.clockOut) {
    // Check if it's today
    const today = TimezoneUtils.startOfDay();
    const recordDate = TimezoneUtils.startOfDay(this.date);
    
    if (recordDate.getTime() === today.getTime()) {
      this.status = 'pending'; // Still working today
    } else {
      this.status = 'partial'; // Didn't clock out on a past day
      this.anomalies = this.anomalies || [];
      if (!this.anomalies.includes('missing_clock_out')) {
        this.anomalies.push('missing_clock_out');
      }
    }
  } else {
    this.status = 'absent';
  }

  // Check for anomalies
  if (this.clockIn?.time) {
    const clockInTime = new Date(this.clockIn.time);
    const hour = clockInTime.getHours();
    
    // Late clock in (after 9 AM) - only flag as anomaly, don't prevent
    if (hour >= 9 && hour < 12) {
      this.anomalies = this.anomalies || [];
      if (!this.anomalies.includes('late_clock_in')) {
        this.anomalies.push('late_clock_in');
      }
    }
  }

  if (this.clockOut?.time) {
    const clockOutTime = new Date(this.clockOut.time);
    const hour = clockOutTime.getHours();
    
    // Early clock out (before 5 PM) - only flag as anomaly, don't prevent
    if (hour < 17 && hour > 6) {
      this.anomalies = this.anomalies || [];
      if (!this.anomalies.includes('early_clock_out')) {
        this.anomalies.push('early_clock_out');
      }
    }
  }

  next();
});

// Instance method to get working duration in hours
attendanceSchema.methods.getWorkingHours = function(): number {
  return this.totalHours || 0;
};

// Instance method to check if attendance is complete
attendanceSchema.methods.isComplete = function(): boolean {
  return !!(this.clockIn && this.clockOut);
};

// Static method to get attendance for date range
attendanceSchema.statics.getForDateRange = function(userId: string, startDate: Date, endDate: Date) {
  return this.find({
    userId,
    date: {
      $gte: TimezoneUtils.startOfDay(startDate),
      $lte: TimezoneUtils.endOfDay(endDate),
    }
  }).sort({ date: -1 });
};

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);