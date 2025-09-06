import express from 'express';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { LocationTracking } from '../models/LocationTracking';
import { Attendance } from '../models/Attendance';
import { Geofence } from '../models/Geofence';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Update current location and battery status
router.post('/update', auth, async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, deviceInfo } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Find active geofences for this user
    const activeGeofences = await Geofence.find({
      isActive: true,
      $or: [
        { assignedUsers: req.user.id },
        { assignedUsers: { $size: 0 } }
      ]
    });

    // Check which geofences the user is currently in
    const currentGeofences = [];
    for (const geofence of activeGeofences) {
      const isInside = await checkPointInGeofence(lat, lng, geofence);
      if (isInside) {
        currentGeofences.push(geofence._id);
      }
    }

    // Create location tracking entry
    const locationEntry = new LocationTracking({
      userId: req.user.id,
      location: { lat, lng, accuracy },
      geofences: currentGeofences,
      deviceInfo: {
        platform: deviceInfo?.platform,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        ...deviceInfo
      },
      batteryLevel,
      isInsideGeofence: currentGeofences.length > 0,
      metadata: {
        source: 'manual_update',
        userAgent: req.headers['user-agent']
      }
    });

    await locationEntry.save();

    // Update user's last known location
    await User.findByIdAndUpdate(req.user.id, {
      'lastLocation.coordinates': [lng, lat],
      'lastLocation.timestamp': new Date(),
      'lastLocation.batteryLevel': batteryLevel
    });

    // Check for geofence violations
    const violations = await checkGeofenceViolations(req.user.id, lat, lng, currentGeofences);

    res.json({
      success: true,
      trackingId: locationEntry._id,
      currentGeofences: currentGeofences.length,
      batteryLevel,
      violations: violations.length,
      timestamp: locationEntry.timestamp
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating location', error });
  }
});

// Get real-time location data for admin dashboard
router.get('/realtime', adminAuth, async (req, res) => {
  try {
    const timeThreshold = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
    
    // Get latest location for each active user
    const realtimeData = await LocationTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: timeThreshold }
        }
      },
      {
        $sort: { userId: 1, timestamp: -1 }
      },
      {
        $group: {
          _id: '$userId',
          latestTracking: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $lookup: {
          from: 'geofences',
          localField: 'latestTracking.geofences',
          foreignField: '_id',
          as: 'currentGeofences'
        }
      },
      {
        $project: {
          userId: '$_id',
          user: {
            name: '$user.name',
            email: '$user.email',
            role: '$user.role',
            avatar: '$user.avatar'
          },
          location: '$latestTracking.location',
          batteryLevel: '$latestTracking.batteryLevel',
          timestamp: '$latestTracking.timestamp',
          isInsideGeofence: '$latestTracking.isInsideGeofence',
          geofences: {
            $map: {
              input: '$currentGeofences',
              as: 'gf',
              in: {
                id: '$$gf._id',
                name: '$$gf.name',
                type: '$$gf.type'
              }
            }
          },
          deviceInfo: '$latestTracking.deviceInfo',
          connectionStatus: {
            $cond: {
              if: { $gte: ['$latestTracking.timestamp', new Date(Date.now() - 2 * 60 * 1000)] },
              then: 'online',
              else: 'offline'
            }
          }
        }
      },
      {
        $sort: { 'user.name': 1 }
      }
    ]);

    // Get summary statistics
    const totalUsers = realtimeData.length;
    const onlineUsers = realtimeData.filter(user => user.connectionStatus === 'online').length;
    const usersInGeofence = realtimeData.filter(user => user.isInsideGeofence).length;
    const lowBatteryUsers = realtimeData.filter(user => user.batteryLevel && user.batteryLevel < 20).length;

    res.json({
      users: realtimeData,
      statistics: {
        totalUsers,
        onlineUsers,
        usersInGeofence,
        lowBatteryUsers,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching realtime data', error });
  }
});

// Get location history for a specific user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check permissions
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const locationHistory = await LocationTracking.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .populate('geofences', 'name type')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

    const total = await LocationTracking.countDocuments({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    // Calculate movement patterns
    const movements = [];
    for (let i = 0; i < locationHistory.length - 1; i++) {
      const current = locationHistory[i];
      const next = locationHistory[i + 1];
      
      const distance = calculateDistance(
        current.location.latitude, current.location.longitude,
        next.location.latitude, next.location.longitude
      );
      
      const timeDiff = (current.timestamp.getTime() - next.timestamp.getTime()) / 1000; // seconds
      const speed = distance > 0 && timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0; // km/h

      movements.push({
        from: next.location,
        to: current.location,
        distance: Math.round(distance),
        duration: Math.round(timeDiff),
        speed: Math.round(speed * 100) / 100,
        timestamp: current.timestamp
      });
    }

    res.json({
      history: locationHistory,
      movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        period: { startDate, endDate },
        totalPoints: locationHistory.length,
        totalDistance: movements.reduce((sum, m) => sum + m.distance, 0),
        avgSpeed: movements.length > 0 ? movements.reduce((sum, m) => sum + m.speed, 0) / movements.length : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching location history', error });
  }
});

// Get battery status analytics
router.get('/battery-analytics', adminAuth, async (req, res) => {
  try {
    const timeRange = parseInt(req.query.hours as string) || 24;
    const startDate = new Date(Date.now() - timeRange * 60 * 60 * 1000);

    const batteryData = await LocationTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate },
          batteryLevel: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          avgBattery: { $avg: '$batteryLevel' },
          minBattery: { $min: '$batteryLevel' },
          maxBattery: { $max: '$batteryLevel' },
          readings: { $sum: 1 },
          lastReading: { $max: '$timestamp' },
          currentBattery: { $last: '$batteryLevel' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: { name: '$user.name', email: '$user.email' },
          batteryStats: {
            current: '$currentBattery',
            average: { $round: ['$avgBattery', 1] },
            minimum: '$minBattery',
            maximum: '$maxBattery',
            readings: '$readings',
            lastUpdate: '$lastReading',
            status: {
              $switch: {
                branches: [
                  { case: { $lt: ['$currentBattery', 15] }, then: 'critical' },
                  { case: { $lt: ['$currentBattery', 30] }, then: 'low' },
                  { case: { $gte: ['$currentBattery', 80] }, then: 'good' }
                ],
                default: 'moderate'
              }
            }
          }
        }
      },
      {
        $sort: { 'batteryStats.current': 1 }
      }
    ]);

    // Overall statistics
    const totalUsers = batteryData.length;
    const criticalBattery = batteryData.filter(user => user.batteryStats.status === 'critical').length;
    const lowBattery = batteryData.filter(user => user.batteryStats.status === 'low').length;
    const avgBatteryLevel = batteryData.reduce((sum, user) => sum + user.batteryStats.current, 0) / totalUsers;

    res.json({
      users: batteryData,
      summary: {
        totalUsers,
        criticalBattery,
        lowBattery,
        avgBatteryLevel: Math.round(avgBatteryLevel * 10) / 10,
        timeRange: `${timeRange} hours`,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching battery analytics', error });
  }
});

// Location-based attendance endpoints
router.post('/attendance/checkin', auth, async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, deviceInfo } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      userId: req.user.id,
      date: today
    });

    if (existingAttendance && existingAttendance.checkIn) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    // Validate location against geofences
    const validGeofences = await Geofence.find({
      isActive: true,
      allowAttendance: true,
      $or: [
        { assignedUsers: req.user.id },
        { assignedUsers: { $size: 0 } }
      ]
    });

    let isValidLocation = false;
    let geofenceId = null;

    for (const geofence of validGeofences) {
      if (await checkPointInGeofence(lat, lng, geofence)) {
        isValidLocation = true;
        geofenceId = geofence._id;
        break;
      }
    }

    const attendanceData = {
      userId: req.user.id,
      date: today,
      checkIn: {
        time: new Date(),
        location: {
          lat,
          lng,
          accuracy,
          geofenceId,
          isValidLocation,
          batteryLevel,
          deviceInfo: {
            platform: deviceInfo?.platform,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip
          }
        },
        method: isValidLocation ? 'geofence' : 'manual',
        verificationData: {
          deviceFingerprint: req.headers['user-agent'] || 'unknown',
          isValidDevice: true
        }
      },
      status: 'present'
    };

    let attendance;
    if (existingAttendance) {
      Object.assign(existingAttendance, attendanceData);
      attendance = await existingAttendance.save();
    } else {
      attendance = new Attendance(attendanceData);
      await attendance.save();
    }

    // Log location tracking
    const locationEntry = new LocationTracking({
      userId: req.user.id,
      location: { lat, lng, accuracy },
      geofences: geofenceId ? [geofenceId] : [],
      batteryLevel,
      isInsideGeofence: isValidLocation,
      metadata: { source: 'attendance_checkin' }
    });
    await locationEntry.save();

    res.json({
      success: true,
      attendance,
      locationValidation: {
        isValid: isValidLocation,
        geofenceId,
        message: isValidLocation ? 'Check-in location validated' : 'Check-in outside designated area'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing check-in', error });
  }
});

router.post('/attendance/checkout', auth, async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, deviceInfo } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      userId: req.user.id,
      date: today
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ message: 'No check-in found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    // Validate location
    const validGeofences = await Geofence.find({
      isActive: true,
      allowAttendance: true,
      $or: [
        { assignedUsers: req.user.id },
        { assignedUsers: { $size: 0 } }
      ]
    });

    let isValidLocation = false;
    let geofenceId = null;

    for (const geofence of validGeofences) {
      if (await checkPointInGeofence(lat, lng, geofence)) {
        isValidLocation = true;
        geofenceId = geofence._id;
        break;
      }
    }

    attendance.checkOut = {
      time: new Date(),
      location: {
        lat,
        lng,
        accuracy,
        geofenceId,
        isValidLocation,
        batteryLevel,
        deviceInfo: {
          platform: deviceInfo?.platform,
          userAgent: req.headers['user-agent'] || 'unknown',
          ipAddress: req.ip || 'unknown'
        }
      },
      method: isValidLocation ? 'geofence' : 'manual',
      verificationData: {
        deviceFingerprint: req.headers['user-agent'] || 'unknown',
        isValidDevice: true
      }
    };

    await attendance.save();

    // Log location tracking
    const locationEntry = new LocationTracking({
      userId: req.user.id,
      location: { lat, lng, accuracy },
      geofences: geofenceId ? [geofenceId] : [],
      batteryLevel,
      isInsideGeofence: isValidLocation,
      metadata: { source: 'attendance_checkout' }
    });
    await locationEntry.save();

    res.json({
      success: true,
      attendance,
      locationValidation: {
        isValid: isValidLocation,
        geofenceId,
        message: isValidLocation ? 'Check-out location validated' : 'Check-out outside designated area'
      },
      totalHours: attendance.totalHours
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing check-out', error });
  }
});

// Helper functions
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const checkPointInGeofence = async (lat: number, lng: number, geofence: any): Promise<boolean> => {
  if (geofence.type === 'circle') {
    const distance = calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
    return distance <= geofence.radius;
  }
  // Add polygon logic here if needed
  return false;
};

const checkGeofenceViolations = async (userId: string, lat: number, lng: number, currentGeofences: any[]): Promise<any[]> => {
  // Implementation for checking violations
  // This would include logic for unauthorized exits, late entries, etc.
  return [];
};

export default router;
