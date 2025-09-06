import express from 'express';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { Geofence } from '../models/Geofence';
import { LocationTracking } from '../models/LocationTracking';
import { User } from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// Utility function to check if point is inside geofence
const isPointInGeofence = (lat: number, lng: number, geofence: any): boolean => {
  if (geofence.type === 'circle') {
    const distance = calculateDistance(lat, lng, geofence.center.lat, geofence.center.lng);
    return distance <= geofence.radius;
  } else if (geofence.type === 'polygon') {
    return isPointInPolygon(lat, lng, geofence.coordinates);
  }
  return false;
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth's radius in meters
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

// Ray casting algorithm for point in polygon
const isPointInPolygon = (lat: number, lng: number, polygon: Array<{lat: number, lng: number}>): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i].lat > lat) !== (polygon[j].lat > lat)) &&
        (lng < (polygon[j].lng - polygon[i].lng) * (lat - polygon[i].lat) / (polygon[j].lat - polygon[i].lat) + polygon[i].lng)) {
      inside = !inside;
    }
  }
  return inside;
};

// Create geofence (Admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const geofence = new Geofence({
      ...req.body,
      createdBy: req.user.id
    });

    await geofence.save();
    res.status(201).json(geofence);
  } catch (error) {
    res.status(400).json({ message: 'Error creating geofence', error });
  }
});

// Get all geofences
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    
    // Filter by active status
    if (req.query.active !== undefined) {
      query.isActive = req.query.active === 'true';
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    const geofences = await Geofence.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedUsers', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Geofence.countDocuments(query);

    res.json({
      geofences,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching geofences', error });
  }
});

// Get geofence by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const geofence = await Geofence.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedUsers', 'name email role');

    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    res.json(geofence);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching geofence', error });
  }
});

// Update geofence (Admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('assignedUsers', 'name email role');

    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    res.json(geofence);
  } catch (error) {
    res.status(400).json({ message: 'Error updating geofence', error });
  }
});

// Delete geofence (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndDelete(req.params.id);

    if (!geofence) {
      return res.status(404).json({ message: 'Geofence not found' });
    }

    res.json({ message: 'Geofence deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting geofence', error });
  }
});

// Check if user is in any geofence
router.post('/check-location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Get all active geofences for the user
    const geofences = await Geofence.find({
      isActive: true,
      $or: [
        { assignedUsers: req.user.id },
        { assignedUsers: { $size: 0 } } // Global geofences
      ]
    });

    const userGeofences = [];
    for (const geofence of geofences) {
      if (isPointInGeofence(lat, lng, geofence)) {
        userGeofences.push({
          id: geofence._id,
          name: geofence.name,
          type: geofence.type,
          autoAssignTasks: geofence.autoAssignTasks,
          workingHours: geofence.workingHours
        });
      }
    }

    // Log location tracking
    const locationTracking = new LocationTracking({
      userId: req.user.id,
      location: {
        lat,
        lng,
        accuracy: req.body.accuracy || 10
      },
      geofences: userGeofences.map(g => g.id),
      deviceInfo: {
        platform: req.body.deviceInfo?.platform,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      },
      batteryLevel: req.body.batteryLevel,
      isInsideGeofence: userGeofences.length > 0
    });

    await locationTracking.save();

    res.json({
      isInsideGeofence: userGeofences.length > 0,
      geofences: userGeofences,
      trackingId: locationTracking._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking location', error });
  }
});

// Get user's geofence history
router.get('/user/:userId/history', auth, async (req, res) => {
  try {
    // Check if user can access this data
    if (req.user.role !== 'admin' && req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const locationHistory = await LocationTracking.find({
      userId: req.params.userId,
      timestamp: { $gte: startDate, $lte: endDate }
    })
    .populate('geofences', 'name type')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

    const total = await LocationTracking.countDocuments({
      userId: req.params.userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    res.json({
      history: locationHistory,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching location history', error });
  }
});

// Get geofence analytics (Admin only)
router.get('/:id/analytics', adminAuth, async (req, res) => {
  try {
    const geofenceId = req.params.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    // Get visits to this geofence
    const visits = await LocationTracking.aggregate([
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
          visits: { $sum: 1 },
          firstEntry: { $min: '$timestamp' },
          lastExit: { $max: '$timestamp' },
          avgBatteryLevel: { $avg: '$batteryLevel' }
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
          user: { name: '$user.name', email: '$user.email' },
          visits: 1,
          duration: { $subtract: ['$lastExit', '$firstEntry'] },
          avgBatteryLevel: { $round: ['$avgBatteryLevel', 1] }
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);

    // Get overall statistics
    const totalVisits = visits.reduce((sum, visit) => sum + visit.visits, 0);
    const uniqueUsers = new Set(visits.map(visit => visit.user.email)).size;
    const avgDuration = visits.length > 0 ? visits.reduce((sum, visit) => sum + visit.duration, 0) / visits.length : 0;

    res.json({
      geofenceId,
      period: { startDate, endDate },
      statistics: {
        totalVisits,
        uniqueUsers,
        avgDuration: Math.round(avgDuration / (1000 * 60)), // Convert to minutes
        totalDays: visits.length
      },
      visits
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching geofence analytics', error });
  }
});

// Get nearby users for admin dashboard
router.post('/nearby-users', adminAuth, async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.body; // radius in meters

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Get recent location data within the specified radius
    const recentLocations = await LocationTracking.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 minutes
          location: {
            $geoWithin: {
              $centerSphere: [[lng, lat], radius / 6378100] // radius in radians
            }
          }
        }
      },
      {
        $sort: { userId: 1, timestamp: -1 }
      },
      {
        $group: {
          _id: '$userId',
          latestLocation: { $first: '$$ROOT' }
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
          user: { name: '$user.name', email: '$user.email', role: '$user.role' },
          location: '$latestLocation.location',
          timestamp: '$latestLocation.timestamp',
          batteryLevel: '$latestLocation.batteryLevel',
          isInsideGeofence: '$latestLocation.isInsideGeofence',
          geofences: '$latestLocation.geofences'
        }
      }
    ]);

    res.json({
      searchCenter: { lat, lng },
      radius,
      nearbyUsers: recentLocations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching nearby users', error });
  }
});

export default router;
