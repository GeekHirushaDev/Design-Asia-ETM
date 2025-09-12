import express from 'express';
import { body, validationResult } from 'express-validator';
import TrackingPoint from '../models/TrackingPoint.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Submit tracking point
router.post('/ping', [
  authenticateToken,
  body('location.lat').isNumeric().withMessage('Valid latitude required'),
  body('location.lng').isNumeric().withMessage('Valid longitude required'),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 }),
  body('speed').optional().isNumeric({ min: 0 }),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { location, batteryLevel, speed } = req.body;

    const trackingPoint = new TrackingPoint({
      userId: req.user?._id,
      timestamp: new Date(),
      location,
      batteryLevel,
      speed,
    });

    await trackingPoint.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Tracking ping error:', error);
    res.status(500).json({ error: 'Failed to save tracking point' });
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