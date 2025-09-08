import mongoose, { Schema, Document } from 'mongoose';
import { IAttendance, ILocation } from '@shared/types';

export interface IAttendanceDocument extends IAttendance, Document {
  calculateHours(): number;
  isLate(): boolean;
  isEarlyDeparture(): boolean;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       required:
 *         - userId
 *         - date
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated attendance ID
 *         userId:
 *           type: string
 *           description: ID of the user
 *         date:
 *           type: string
 *           format: date
 *           description: Attendance date
 *         clockInTime:
 *           type: string
 *           format: date-time
 *           description: Clock in timestamp
 *         clockOutTime:
 *           type: string
 *           format: date-time
 *           description: Clock out timestamp
 *         clockInLocation:
 *           $ref: '#/components/schemas/Location'
 *         clockOutLocation:
 *           $ref: '#/components/schemas/Location'
 *         totalHours:
 *           type: number
 *           description: Total hours worked
 *         status:
 *           type: string
 *           enum: [present, absent, late, early_departure]
 *           description: Attendance status
 *         notes:
 *           type: string
 *           description: Optional notes
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// Location subdocument schema (reused from Task model)
const locationSchema = new Schema<ILocation>(
  {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    address: {
      type: String,
      default: null,
      maxlength: [200, 'Address cannot be more than 200 characters']
    }
  },
  { _id: false }
);

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      set: function(value: Date) {
        // Normalize to start of day
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
      }
    },
    clockInTime: {
      type: Date,
      default: null
    },
    clockOutTime: {
      type: Date,
      default: null,
      validate: {
        validator: function(this: IAttendanceDocument, value: Date) {
          return !value || !this.clockInTime || value >= this.clockInTime;
        },
        message: 'Clock out time must be after clock in time'
      }
    },
    clockInLocation: {
      type: locationSchema,
      default: null
    },
    clockOutLocation: {
      type: locationSchema,
      default: null
    },
    totalHours: {
      type: Number,
      default: null,
      min: [0, 'Total hours cannot be negative'],
      max: [24, 'Total hours cannot exceed 24 hours per day']
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'early_departure'],
      default: 'absent',
      required: [true, 'Status is required']
    },
    notes: {
      type: String,
      default: null,
      maxlength: [500, 'Notes cannot be more than 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

// Compound index to ensure one attendance record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ userId: 1, date: -1 });

// Virtual for checking if user is currently clocked in
attendanceSchema.virtual('isClockedIn').get(function(this: IAttendanceDocument) {
  return this.clockInTime && !this.clockOutTime;
});

// Virtual for current work duration (if clocked in)
attendanceSchema.virtual('currentWorkDuration').get(function(this: IAttendanceDocument) {
  if (this.clockInTime && !this.clockOutTime) {
    const now = new Date();
    return Math.round((now.getTime() - this.clockInTime.getTime()) / (1000 * 60 * 60 * 100)) / 100; // hours with 2 decimal places
  }
  return 0;
});

// Pre-save middleware to calculate total hours and update status
attendanceSchema.pre('save', function(this: IAttendanceDocument, next) {
  // Calculate total hours if both clock in and out times are set
  if (this.clockInTime && this.clockOutTime) {
    this.totalHours = Math.round((this.clockOutTime.getTime() - this.clockInTime.getTime()) / (1000 * 60 * 60) * 100) / 100;
  }
  
  // Update status based on times
  if (this.clockInTime) {
    const workStartTime = new Date(this.clockInTime);
    workStartTime.setHours(9, 0, 0, 0); // Assuming 9 AM start time
    
    if (this.clockInTime > workStartTime) {
      this.status = 'late';
    } else if (this.clockOutTime) {
      const workEndTime = new Date(this.clockOutTime);
      workEndTime.setHours(17, 0, 0, 0); // Assuming 5 PM end time
      
      if (this.clockOutTime < workEndTime && this.totalHours && this.totalHours < 8) {
        this.status = 'early_departure';
      } else {
        this.status = 'present';
      }
    } else {
      this.status = 'present';
    }
  } else {
    this.status = 'absent';
  }
  
  next();
});

// Method to calculate hours worked
attendanceSchema.methods.calculateHours = function(this: IAttendanceDocument): number {
  if (this.clockInTime && this.clockOutTime) {
    return Math.round((this.clockOutTime.getTime() - this.clockInTime.getTime()) / (1000 * 60 * 60) * 100) / 100;
  }
  return 0;
};

// Method to check if arrival was late
attendanceSchema.methods.isLate = function(this: IAttendanceDocument): boolean {
  if (!this.clockInTime) return false;
  
  const workStartTime = new Date(this.clockInTime);
  workStartTime.setHours(9, 0, 0, 0); // 9 AM start time
  
  return this.clockInTime > workStartTime;
};

// Method to check if departure was early
attendanceSchema.methods.isEarlyDeparture = function(this: IAttendanceDocument): boolean {
  if (!this.clockOutTime || !this.totalHours) return false;
  
  const workEndTime = new Date(this.clockOutTime);
  workEndTime.setHours(17, 0, 0, 0); // 5 PM end time
  
  return this.clockOutTime < workEndTime && this.totalHours < 8;
};

// Static method to find attendance for date range
attendanceSchema.statics.findByDateRange = function(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });
};

// Static method to get attendance stats for user
attendanceSchema.statics.getAttendanceStats = async function(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const records = await this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const stats = {
    totalDays: records.length,
    presentDays: records.filter(r => r.status === 'present').length,
    lateDays: records.filter(r => r.status === 'late').length,
    earlyDepartures: records.filter(r => r.status === 'early_departure').length,
    absentDays: records.filter(r => r.status === 'absent').length,
    totalHours: records.reduce((sum, r) => sum + (r.totalHours || 0), 0),
    averageHours: 0,
    attendanceRate: 0
  };
  
  if (stats.totalDays > 0) {
    stats.averageHours = Math.round((stats.totalHours / stats.totalDays) * 100) / 100;
    stats.attendanceRate = Math.round(((stats.presentDays + stats.lateDays) / stats.totalDays) * 100);
  }
  
  return stats;
};

// Static method to find current clocked in users
attendanceSchema.statics.findClockedInUsers = function(date?: Date) {
  const queryDate = date || new Date();
  queryDate.setHours(0, 0, 0, 0);
  
  return this.find({
    date: queryDate,
    clockInTime: { $exists: true, $ne: null },
    clockOutTime: null
  }).populate('userId', 'firstName lastName email department');
};

export const Attendance = mongoose.model<IAttendanceDocument>('Attendance', attendanceSchema);
export default Attendance;
