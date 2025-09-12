import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { startOfDay, endOfDay } from 'date-fns';

const router = express.Router();

// Clock in
router.post('/clock-in', [
  authenticateToken,
  body('location.lat').isNumeric().withMessage('Valid latitude required'),
  body('location.lng').isNumeric().withMessage('Valid longitude required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const today = startOfDay(new Date());
    const { location } = req.body;

    // Check if already clocked in today
    let attendance = await Attendance.findOne({
      userId: req.user?._id,
      date: today,
    });

    if (attendance && attendance.clockIn) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    const clockInData = {
      time: new Date(),
      location,
    };

    if (attendance) {
      attendance.clockIn = clockInData;
      await attendance.save();
    } else {
      attendance = new Attendance({
        userId: req.user?._id,
        date: today,
        clockIn: clockInData,
      });
      await attendance.save();
    }

    await attendance.populate('userId', 'name email');

    res.json({ attendance });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/clock-out', [
  authenticateToken,
  body('location.lat').isNumeric().withMessage('Valid latitude required'),
  body('location.lng').isNumeric().withMessage('Valid longitude required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const today = startOfDay(new Date());
    const { location } = req.body;

    const attendance = await Attendance.findOne({
      userId: req.user?._id,
      date: today,
    });

    if (!attendance || !attendance.clockIn) {
      return res.status(400).json({ error: 'Must clock in first' });
    }

    if (attendance.clockOut) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }

    attendance.clockOut = {
      time: new Date(),
      location,
    };

    await attendance.save();
    await attendance.populate('userId', 'name email');

    res.json({ attendance });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Get attendance records
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate as string),
        $lte: endOfDay(new Date(endDate as string)),
      };
    }

    const attendance = await Attendance.find(filter)
      .populate('userId', 'name email')
      .sort({ date: -1 })
      .limit(50);

    res.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

export default router;