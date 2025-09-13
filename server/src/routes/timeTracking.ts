import express, { Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import { TimeTrackingService } from '../services/timeTrackingService.js';
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns';

const router = express.Router();

// Start time tracking
router.post('/start', [
  authenticateToken,
  body('taskId').isMongoId().withMessage('Valid task ID is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('estimatedDurationSeconds').optional().isInt({ min: 0 }).withMessage('Estimated duration must be a positive integer'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, description, estimatedDurationSeconds } = req.body;
    const timeLog = await TimeTrackingService.startTimeTracking(
      req.user!._id,
      taskId,
      description,
      estimatedDurationSeconds
    );

    return res.status(201).json({
      message: 'Time tracking started successfully',
      timeLog
    });
  } catch (error) {
    console.error('Start time tracking error:', error);
    return res.status(500).json({ error: 'Failed to start time tracking' });
  }
});

// Stop time tracking
router.post('/stop/:timeLogId', [
  authenticateToken,
  param('timeLogId').isMongoId().withMessage('Valid time log ID is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { timeLogId } = req.params;
    const { description } = req.body;
    
    const timeLog = await TimeTrackingService.stopTimeTracking(timeLogId, description);

    return res.json({
      message: 'Time tracking stopped successfully',
      timeLog
    });
  } catch (error: any) {
    console.error('Stop time tracking error:', error);
    return res.status(error.message === 'No active time tracking found' ? 404 : 500).json({ 
      error: error.message || 'Failed to stop time tracking' 
    });
  }
});

// Stop all active time tracking for user
router.post('/stop-all', [
  authenticateToken,
], async (req: AuthRequest, res: Response) => {
  try {
    const stoppedLogs = await TimeTrackingService.stopActiveTimeTracking(req.user!._id);

    return res.json({
      message: 'All active time tracking stopped successfully',
      stoppedLogs: stoppedLogs.length
    });
  } catch (error) {
    console.error('Stop all time tracking error:', error);
    return res.status(500).json({ error: 'Failed to stop time tracking' });
  }
});

// Get active time tracking
router.get('/active', [
  authenticateToken,
], async (req: AuthRequest, res: Response) => {
  try {
    const activeLog = await TimeTrackingService.getActiveTimeTracking(req.user!._id);

    return res.json({
      activeLog
    });
  } catch (error) {
    console.error('Get active time tracking error:', error);
    return res.status(500).json({ error: 'Failed to get active time tracking' });
  }
});

// Log manual time entry
router.post('/manual', [
  authenticateToken,
  body('taskId').isMongoId().withMessage('Valid task ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, startTime, endTime, description, tags, billable } = req.body;

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const timeLog = await TimeTrackingService.logManualTime({
      userId: req.user!._id,
      taskId,
      startTime: start,
      endTime: end,
      description,
      tags,
      billable
    });

    return res.status(201).json({
      message: 'Manual time entry logged successfully',
      timeLog
    });
  } catch (error) {
    console.error('Log manual time error:', error);
    return res.status(500).json({ error: 'Failed to log manual time' });
  }
});

// Log break time
router.post('/break', [
  authenticateToken,
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('breakType').isIn(['lunch', 'coffee', 'meeting', 'other']).withMessage('Valid break type is required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startTime, endTime, breakType, description } = req.body;

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    const timeLog = await TimeTrackingService.logBreakTime({
      userId: req.user!._id,
      startTime: start,
      endTime: end,
      breakType,
      description
    });

    return res.status(201).json({
      message: 'Break time logged successfully',
      timeLog
    });
  } catch (error) {
    console.error('Log break time error:', error);
    return res.status(500).json({ error: 'Failed to log break time' });
  }
});

// Get time logs for date range
router.get('/logs', [
  authenticateToken,
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('taskId').optional().isMongoId().withMessage('Valid task ID required'),
  query('includeBreaks').optional().isBoolean().withMessage('Include breaks must be boolean'),
  query('billableOnly').optional().isBoolean().withMessage('Billable only must be boolean'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, taskId, includeBreaks, billableOnly } = req.query;

    // Default to last 7 days if no dates provided
    const end = endDate ? parseISO(endDate as string) : new Date();
    const start = startDate ? parseISO(startDate as string) : subDays(end, 7);

    const timeLogs = await TimeTrackingService.getTimeLogs(
      req.user!._id,
      start,
      end,
      {
        taskId: taskId as string,
        includeBreaks: includeBreaks === 'true',
        billableOnly: billableOnly === 'true'
      }
    );

    return res.json({
      timeLogs,
      period: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('Get time logs error:', error);
    return res.status(500).json({ error: 'Failed to get time logs' });
  }
});

// Get daily time summary
router.get('/summary/daily/:date', [
  authenticateToken,
  param('date').isISO8601().withMessage('Valid date is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { date } = req.params;
    const summary = await TimeTrackingService.getDailyTimeSummary(
      req.user!._id,
      parseISO(date)
    );

    return res.json(summary);
  } catch (error) {
    console.error('Get daily summary error:', error);
    return res.status(500).json({ error: 'Failed to get daily summary' });
  }
});

// Get weekly time summary
router.get('/summary/weekly/:weekStart', [
  authenticateToken,
  param('weekStart').isISO8601().withMessage('Valid week start date is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { weekStart } = req.params;
    const summary = await TimeTrackingService.getWeeklyTimeSummary(
      req.user!._id,
      parseISO(weekStart)
    );

    return res.json(summary);
  } catch (error) {
    console.error('Get weekly summary error:', error);
    return res.status(500).json({ error: 'Failed to get weekly summary' });
  }
});

// Get task time analysis
router.get('/task/:taskId/analysis', [
  authenticateToken,
  param('taskId').isMongoId().withMessage('Valid task ID is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const analysis = await TimeTrackingService.getTaskTimeAnalysis(taskId);

    return res.json(analysis);
  } catch (error) {
    console.error('Get task analysis error:', error);
    return res.status(500).json({ error: 'Failed to get task analysis' });
  }
});

// Get user time statistics
router.get('/statistics', [
  authenticateToken,
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { days } = req.query;
    const statistics = await TimeTrackingService.getUserTimeStatistics(
      req.user!._id,
      days ? parseInt(days as string) : 30
    );

    return res.json(statistics);
  } catch (error) {
    console.error('Get user statistics error:', error);
    return res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Update time log
router.put('/:timeLogId', [
  authenticateToken,
  param('timeLogId').isMongoId().withMessage('Valid time log ID is required'),
  body('startTime').optional().isISO8601().withMessage('Valid start time required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('billable').optional().isBoolean().withMessage('Billable must be a boolean'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { timeLogId } = req.params;
    const updates = req.body;

    // Validate time range if both times are provided
    if (updates.startTime && updates.endTime) {
      const start = new Date(updates.startTime);
      const end = new Date(updates.endTime);
      if (start >= end) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
    }

    const timeLog = await TimeTrackingService.updateTimeLog(timeLogId, updates);

    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    return res.json({
      message: 'Time log updated successfully',
      timeLog
    });
  } catch (error) {
    console.error('Update time log error:', error);
    return res.status(500).json({ error: 'Failed to update time log' });
  }
});

// Delete time log
router.delete('/:timeLogId', [
  authenticateToken,
  param('timeLogId').isMongoId().withMessage('Valid time log ID is required'),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { timeLogId } = req.params;
    const timeLog = await TimeTrackingService.deleteTimeLog(timeLogId);

    if (!timeLog) {
      return res.status(404).json({ error: 'Time log not found' });
    }

    return res.json({
      message: 'Time log deleted successfully'
    });
  } catch (error) {
    console.error('Delete time log error:', error);
    return res.status(500).json({ error: 'Failed to delete time log' });
  }
});

export default router;