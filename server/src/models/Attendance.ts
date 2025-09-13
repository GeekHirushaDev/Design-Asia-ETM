import mongoose, { Schema } from 'mongoose';
import { IAttendance } from '../types/index.js';

const attendanceSchema = new Schema<IAttendance>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    clockIn: {
      time: { type: Date },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    clockOut: {
      time: { type: Date },
      location: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    notes: {
      type: String,
    },
    anomalies: [String],
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', attendanceSchema);