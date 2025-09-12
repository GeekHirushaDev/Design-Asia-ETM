import express from 'express';
import TrackingPoint from '../models/TrackingPoint.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { trackingPingSchema } from '../validation/schemas.js';
import { GeofenceService } from '../services/geofenceService.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Submit tracking point
router.post('/ping', [
  authenticateToken,
  validate(trackingPingSchema),
], async (req: AuthRequest, res) => {
  try {
    const { location, batteryLevel, speed } = req.body;

    const trackingPoint = new TrackingPoint({
      userId: req.user?._id,
      timestamp: new Date(),
      location,
      batteryLevel,
      speed,
    });

    await trackingPoint.save();

    // Check geofence events
    try {
      const geofenceEvents = await GeofenceService.checkGeofenceEvents(req.user?._id!, location);
      if (geofenceEvents.length > 0) {
        console.log('Geofence events:', geofenceEvents);
      }
    } catch (geofenceError) {
      console.error('Geofence check error:', geofenceError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Tracking ping error:', error);
    res.status(500).json({ error: 'Failed to save tracking point' });
  }
});

// Get tracking breadcrumbs/trail
router.get('/trail/:userId', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 1000 } = req.query;

    const filter: any = { userId };
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const points = await TrackingPoint.find(filter)
      .sort({ timestamp: 1 })
      .limit(Number(limit))
      .select('location timestamp speed');

    // Group points into trail segments (break on time gaps > 30 minutes)
    const trails = [];
    let currentTrail: any[] = [];
    let lastTimestamp: Date | null = null;

    for (const point of points) {
      if (lastTimestamp && point.timestamp.getTime() - lastTimestamp.getTime() > 30 * 60 * 1000) {
        if (currentTrail.length > 0) {
          trails.push(currentTrail);
          currentTrail = [];
        }
      }
      
      currentTrail.push({
        lat: point.location.lat,
        lng: point.location.lng,
        timestamp: point.timestamp,
        speed: point.speed,
      });
      
      lastTimestamp = point.timestamp;
    }
    
    if (currentTrail.length > 0) {
      trails.push(currentTrail);
    }

    res.json({ trails });
  } catch (error) {
    console.error('Get tracking trail error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking trail' });
  }
});

// Get tracking history
router.get('/history', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { userId, startDate, endDate, limit = 1000 } = req.query;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (startDate && endDate) {
      filter.timestamp = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const points = await TrackingPoint.find(filter)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ points });
  } catch (error) {
    console.error('Get tracking history error:', error);
    res.status(500).json({ error: 'Failed to fetch tracking history' });
  }
});

// Get current locations
router.get('/current', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    // Get the latest tracking point for each user within the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          timestamp: { $gte: tenMinutesAgo },
        },
      },
      {
        $sort: { userId: 1, timestamp: -1 },
      },
      {
        $group: {
          _id: '$userId',
          latestPoint: { $first: '$$ROOT' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: '$latestPoint._id',
          userId: '$_id',
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            role: '$user.role',
          },
          location: '$latestPoint.location',
          timestamp: '$latestPoint.timestamp',
          batteryLevel: '$latestPoint.batteryLevel',
          speed: '$latestPoint.speed',
        },
      },
    ];

    const currentLocations = await TrackingPoint.aggregate(pipeline);

    res.json({ locations: currentLocations });
  } catch (error) {
    console.error('Get current locations error:', error);
    res.status(500).json({ error: 'Failed to fetch current locations' });
  }
});

export default router;