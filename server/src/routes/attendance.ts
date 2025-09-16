import express from 'express';
import { body, validationResult } from 'express-validator';
import Attendance from '../models/Attendance.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { startOfDay, endOfDay } from 'date-fns';
import { TimezoneUtils } from '../utils/timezone.js';

const router = express.Router();

// Clock in
router.post('/clock-in', [
  authenticateToken,
  body('lat').isNumeric().withMessage('Valid latitude required'),
  body('lng').isNumeric().withMessage('Valid longitude required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng } = req.body;
    const today = TimezoneUtils.startOfDay();

    // Check if already clocked in today
    let attendance = await Attendance.findOne({
      userId: req.user?._id,
      date: today,
    });

    if (attendance && attendance.clockIn) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    const clockInData = {
      time: TimezoneUtils.now(),
      location: { lat, lng },
    };

    if (attendance) {
      // Update existing record
      attendance.clockIn = clockInData;
      await attendance.save();
    } else {
      // Create new record
      attendance = new Attendance({
        userId: req.user?._id,
        date: today,
        clockIn: clockInData,
      });
      await attendance.save();
    }

    await attendance.populate('userId', 'name email');

    res.json({ 
      message: 'Clocked in successfully',
      attendance 
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/clock-out', [
  authenticateToken,
  body('lat').isNumeric().withMessage('Valid latitude required'),
  body('lng').isNumeric().withMessage('Valid longitude required'),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { lat, lng } = req.body;
    const today = TimezoneUtils.startOfDay();

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
      time: TimezoneUtils.now(),
      location: { lat, lng },
    };

    await attendance.save();
    await attendance.populate('userId', 'name email');

    res.json({ 
      message: 'Clocked out successfully',
      attendance 
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Get attendance records
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, userId, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    // Date filtering
    if (startDate && endDate) {
      const start = TimezoneUtils.parseFromFrontend(startDate as string);
      const end = TimezoneUtils.endOfDay(new Date(endDate as string));
      filter.date = {
        $gte: start,
        $lte: end,
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .populate('userId', 'name email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Attendance.countDocuments(filter)
    ]);

    res.json({ 
      attendance,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Get today's attendance
router.get('/today', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const today = TimezoneUtils.startOfDay();
    
    const filter: any = { date: today };
    
    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    }

    const attendance = await Attendance.find(filter)
      .populate('userId', 'name email')
      .sort({ 'clockIn.time': 1 });

    res.json({ attendance });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
});

// Update attendance record (admin only)
router.put('/:attendanceId', [
  authenticateToken,
], async (req: AuthRequest, res) => {
  try {
    // Only admin can update attendance records
    if (req.user?.role !== 'admin' && !(req.user as any)?.isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { attendanceId } = req.params;
    const { clockIn, clockOut, notes } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Update fields
    if (clockIn) {
      attendance.clockIn = {
        time: TimezoneUtils.formatForDB(clockIn.time),
        location: clockIn.location,
      };
    }

    if (clockOut) {
      attendance.clockOut = {
        time: TimezoneUtils.formatForDB(clockOut.time),
        location: clockOut.location,
      };
    }

    if (notes !== undefined) {
      attendance.notes = notes;
    }

    await attendance.save();
    await attendance.populate('userId', 'name email');

    res.json({ 
      message: 'Attendance record updated successfully',
      attendance 
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

// Delete attendance record (admin only)
router.delete('/:attendanceId', [
  authenticateToken,
], async (req: AuthRequest, res) => {
  try {
    // Only admin can delete attendance records
    if (req.user?.role !== 'admin' && !(req.user as any)?.isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { attendanceId } = req.params;

    const attendance = await Attendance.findByIdAndDelete(attendanceId);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Get attendance summary (admin only)
router.get('/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && !(req.user as any)?.isSuperAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate, userId } = req.query;
    const filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    if (startDate && endDate) {
      const start = TimezoneUtils.parseFromFrontend(startDate as string);
      const end = TimezoneUtils.endOfDay(new Date(endDate as string));
      filter.date = { $gte: start, $lte: end };
    }

    const records = await Attendance.find(filter)
      .populate('userId', 'name email')
      .sort({ date: -1 });

    // Calculate summary statistics
    const totalRecords = records.length;
    const presentDays = records.filter(r => r.clockIn && r.clockOut).length;
    const partialDays = records.filter(r => r.clockIn && !r.clockOut).length;
    const absentDays = records.filter(r => !r.clockIn).length;

    const totalHours = records.reduce((sum, record) => {
      if (record.clockIn && record.clockOut) {
        const clockIn = new Date(record.clockIn.time);
        const clockOut = new Date(record.clockOut.time);
        const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
    const attendanceRate = totalRecords > 0 ? (presentDays / totalRecords) * 100 : 0;

    res.json({
      summary: {
        totalRecords,
        presentDays,
        partialDays,
        absentDays,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours: Math.round(averageHours * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
      records,
    });
  } catch (error) {
    console.error('Get attendance summary error:', error);
    res.status(500).json({ error: 'Failed to get attendance summary' });
  }
});

export default router;