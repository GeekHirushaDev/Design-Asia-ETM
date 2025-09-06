import { Geofence, IGeofence } from '../models/Geofence';
import { LocationTracking } from '../models/LocationTracking';
import { Task } from '../models/Task';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { socketService } from '../server';

export interface Point {
  lat: number;
  lng: number;
}

export interface GeofenceEvent {
  userId: string;
  geofenceId: string;
  eventType: 'enter' | 'exit';
  timestamp: Date;
  location: Point;
  batteryLevel?: number;
  metadata?: any;
}

export class GeofenceService {
  /**
   * Calculate distance between two points using Haversine formula
   */
  static calculateDistance(point1: Point, point2: Point): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Check if a point is inside a circular geofence
   */
  static isPointInCircle(point: Point, center: Point, radius: number): boolean {
    const distance = this.calculateDistance(point, center);
    return distance <= radius;
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  static isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    const { lat, lng } = point;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].lat > lat) !== (polygon[j].lat > lat)) &&
          (lng < (polygon[j].lng - polygon[i].lng) * (lat - polygon[i].lat) / (polygon[j].lat - polygon[i].lat) + polygon[i].lng)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Check if a point is inside any type of geofence
   */
  static isPointInGeofence(point: Point, geofence: IGeofence): boolean {
    if (geofence.type === 'circle') {
      return this.isPointInCircle(point, geofence.center, geofence.radius);
    } else if (geofence.type === 'polygon') {
      return this.isPointInPolygon(point, geofence.coordinates);
    }
    return false;
  }

  /**
   * Get all geofences a user is currently inside
   */
  static async getUserCurrentGeofences(userId: string, location: Point): Promise<IGeofence[]> {
    try {
      const activeGeofences = await Geofence.find({
        isActive: true,
        $or: [
          { assignedUsers: userId },
          { assignedUsers: { $size: 0 } } // Global geofences
        ]
      });

      const currentGeofences: IGeofence[] = [];
      
      for (const geofence of activeGeofences) {
        if (this.isPointInGeofence(location, geofence)) {
          currentGeofences.push(geofence);
        }
      }

      return currentGeofences;
    } catch (error) {
      console.error('Error getting user current geofences:', error);
      return [];
    }
  }

  /**
   * Check for geofence violations based on working hours and policies
   */
  static async checkGeofenceViolations(
    userId: string, 
    location: Point, 
    currentGeofences: string[]
  ): Promise<any[]> {
    try {
      const violations = [];
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Get user's assigned geofences with working hours
      const userGeofences = await Geofence.find({
        $or: [
          { assignedUsers: userId },
          { assignedUsers: { $size: 0 } }
        ],
        isActive: true,
        'workingHours.start': { $exists: true }
      });

      for (const geofence of userGeofences) {
        const isCurrentlyInside = currentGeofences.includes(geofence._id.toString());
        const workingHours = geofence.workingHours;

        if (workingHours && workingHours.days.includes(currentDay)) {
          const startHour = parseInt(workingHours.start.split(':')[0]);
          const endHour = parseInt(workingHours.end.split(':')[0]);
          const isWorkingHours = currentHour >= startHour && currentHour <= endHour;

          // Check for violations
          if (isWorkingHours && !isCurrentlyInside && geofence.strictMode) {
            violations.push({
              type: 'unauthorized_exit',
              geofenceId: geofence._id,
              geofenceName: geofence.name,
              timestamp: now,
              location,
              description: `Employee outside required geofence "${geofence.name}" during working hours`
            });
          } else if (!isWorkingHours && isCurrentlyInside && geofence.type === 'circle') {
            violations.push({
              type: 'outside_working_hours',
              geofenceId: geofence._id,
              geofenceName: geofence.name,
              timestamp: now,
              location,
              description: `Employee in geofence "${geofence.name}" outside working hours`
            });
          }
        }
      }

      return violations;
    } catch (error) {
      console.error('Error checking geofence violations:', error);
      return [];
    }
  }

  /**
   * Process geofence entry/exit events
   */
  static async processGeofenceEvent(event: GeofenceEvent): Promise<void> {
    try {
      const { userId, geofenceId, eventType, timestamp, location, batteryLevel } = event;

      // Get geofence and user details
      const geofence = await Geofence.findById(geofenceId);
      const user = await User.findById(userId);

      if (!geofence || !user) {
        console.error('Geofence or user not found for event processing');
        return;
      }

      // Log the event
      console.log(`Geofence ${eventType}: User ${user.email} ${eventType}ed geofence ${geofence.name}`);

      // Auto-assign tasks if enabled
      if (eventType === 'enter' && geofence.autoAssignTasks) {
        await this.autoAssignTasks(userId, geofenceId, location);
      }

      // Handle automatic attendance if enabled
      if (geofence.allowAttendance) {
        await this.handleAutoAttendance(userId, geofenceId, eventType, location, batteryLevel);
      }

      // Emit real-time event to admin dashboard
      socketService.emitToAdmins('geofence-event', {
        userId,
        userName: user.firstName + ' ' + user.lastName,
        geofenceId,
        geofenceName: geofence.name,
        eventType,
        timestamp,
        location,
        batteryLevel
      });

      // Store event in location tracking
      await LocationTracking.create({
        userId,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: 10
        },
        geofences: eventType === 'enter' ? [geofenceId] : [],
        batteryLevel,
        isInsideGeofence: eventType === 'enter',
        metadata: {
          source: 'geofence_event',
          eventType,
          geofenceId
        }
      });

    } catch (error) {
      console.error('Error processing geofence event:', error);
    }
  }

  /**
   * Auto-assign tasks when user enters a geofence
   */
  static async autoAssignTasks(
    userId: string, 
    geofenceId: string, 
    location: Point
  ): Promise<void> {
    try {
      // Find unassigned tasks near this geofence
      const nearbyTasks = await Task.find({
        'location.geofenceId': geofenceId,
        status: 'Not Started',
        assignedTo: { $exists: false }
      }).limit(5);

      for (const task of nearbyTasks) {
        // Check if task location is within reasonable distance
        const taskDistance = this.calculateDistance(location, {
          lat: task.location.lat,
          lng: task.location.lng
        });

        if (taskDistance <= task.location.radius + 100) { // 100m buffer
          task.assignedTo = new mongoose.Types.ObjectId(userId);
          task.status = 'Not Started';
          await task.save();

          // Emit notification
          socketService.emitToUser(userId, 'task-auto-assigned', {
            taskId: task._id,
            title: task.title,
            geofenceId,
            message: 'Task automatically assigned based on your location'
          });
        }
      }
    } catch (error) {
      console.error('Error auto-assigning tasks:', error);
    }
  }

  /**
   * Handle automatic attendance based on geofence entry/exit
   */
  static async handleAutoAttendance(
    userId: string, 
    geofenceId: string, 
    eventType: 'enter' | 'exit',
    location: Point,
    batteryLevel?: number
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let attendance = await Attendance.findOne({
        userId,
        date: today
      });

      if (eventType === 'enter') {
        // Auto check-in
        if (!attendance || !attendance.checkIn) {
          const attendanceData = {
            userId,
            date: today,
            checkIn: {
              time: new Date(),
              location: {
                lat: location.lat,
                lng: location.lng,
                accuracy: 10,
                geofenceId: new mongoose.Types.ObjectId(geofenceId),
                isValidLocation: true,
                batteryLevel,
                deviceInfo: {
                  platform: 'auto',
                  userAgent: 'geofence-auto',
                  ipAddress: 'auto'
                }
              },
              method: 'geofence' as const,
              verificationData: {
                deviceFingerprint: 'geofence-auto',
                isValidDevice: true
              }
            },
            status: 'present' as const
          };

          if (attendance) {
            Object.assign(attendance, attendanceData);
            await attendance.save();
          } else {
            attendance = new Attendance(attendanceData);
            await attendance.save();
          }

          // Emit notification
          socketService.emitToUser(userId, 'auto-checkin', {
            message: 'Automatically checked in via geofence',
            geofenceId,
            timestamp: new Date()
          });
        }
      } else if (eventType === 'exit') {
        // Auto check-out
        if (attendance && attendance.checkIn && !attendance.checkOut) {
          attendance.checkOut = {
            time: new Date(),
            location: {
              lat: location.lat,
              lng: location.lng,
              accuracy: 10,
              geofenceId: new mongoose.Types.ObjectId(geofenceId),
              isValidLocation: true,
              batteryLevel,
              deviceInfo: {
                platform: 'auto',
                userAgent: 'geofence-auto',
                ipAddress: 'auto'
              }
            },
            method: 'geofence' as const,
            verificationData: {
              deviceFingerprint: 'geofence-auto',
              isValidDevice: true
            }
          };

          await attendance.save();

          // Emit notification
          socketService.emitToUser(userId, 'auto-checkout', {
            message: 'Automatically checked out via geofence',
            geofenceId,
            totalHours: attendance.totalHours,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error handling auto attendance:', error);
    }
  }

  /**
   * Get geofence analytics for a specific period
   */
  static async getGeofenceAnalytics(
    geofenceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const analytics = await LocationTracking.aggregate([
        {
          $match: {
            geofences: new mongoose.Types.ObjectId(geofenceId),
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            entries: { $sum: 1 },
            firstEntry: { $min: '$timestamp' },
            lastEntry: { $max: '$timestamp' },
            avgBatteryLevel: { $avg: '$batteryLevel' },
            locations: { $push: '$location' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id.userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            date: '$_id.date',
            user: {
              id: '$user._id',
              name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
              email: '$user.email'
            },
            entries: 1,
            duration: { $subtract: ['$lastEntry', '$firstEntry'] },
            avgBatteryLevel: { $round: ['$avgBatteryLevel', 1] },
            locationCount: { $size: '$locations' }
          }
        },
        {
          $sort: { date: -1, 'user.name': 1 }
        }
      ]);

      return {
        geofenceId,
        period: { startDate, endDate },
        analytics,
        summary: {
          totalVisits: analytics.reduce((sum, item) => sum + item.entries, 0),
          uniqueUsers: new Set(analytics.map(item => item.user.id.toString())).size,
          avgDuration: analytics.length > 0 
            ? analytics.reduce((sum, item) => sum + item.duration, 0) / analytics.length / (1000 * 60) // minutes
            : 0
        }
      };
    } catch (error) {
      console.error('Error getting geofence analytics:', error);
      throw error;
    }
  }

  /**
   * Cleanup old location tracking data
   */
  static async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await LocationTracking.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`Cleaned up ${result.deletedCount} old location tracking records`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  /**
   * Validate geofence configuration
   */
  static validateGeofenceConfig(geofence: Partial<IGeofence>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!geofence.name || geofence.name.trim().length === 0) {
      errors.push('Geofence name is required');
    }

    if (geofence.type === 'circle') {
      if (!geofence.center || !geofence.center.lat || !geofence.center.lng) {
        errors.push('Circle geofence requires center coordinates');
      }
      if (!geofence.radius || geofence.radius <= 0) {
        errors.push('Circle geofence requires positive radius');
      }
    } else if (geofence.type === 'polygon') {
      if (!geofence.coordinates || geofence.coordinates.length < 3) {
        errors.push('Polygon geofence requires at least 3 coordinates');
      }
    }

    if (geofence.workingHours) {
      const { start, end, days } = geofence.workingHours;
      if (!start || !end) {
        errors.push('Working hours require start and end times');
      }
      if (!days || days.length === 0) {
        errors.push('Working hours require at least one day');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default GeofenceService;
