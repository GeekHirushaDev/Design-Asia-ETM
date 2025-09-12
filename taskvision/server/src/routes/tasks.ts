import express from 'express';
import { body, validationResult } from 'express-validator';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get all tasks
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, priority, assignee, page = 1, limit = 20 } = req.query;
    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee && req.user?.role === 'admin') filter.assignedTo = assignee;

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvals.by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
router.post('/', [
  authenticateToken,
  requireRole('admin'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('priority').optional().isIn(['high', 'medium', 'low']),
  body('assignedTo').optional().isArray(),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const taskData = {
      ...req.body,
      createdBy: req.user?._id,
    };

    const task = new Task(taskData);
    await task.save();

    await task.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
    ]);

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvals.by', 'name email');

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee._id.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get time logs for this task
    const timeLogs = await TimeLog.find({ taskId: task._id })
      .populate('userId', 'name')
      .sort({ startTime: -1 });

    const totalTime = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);

    res.json({ 
      task, 
      timeLogs,
      stats: {
        totalTimeSeconds: totalTime,
        estimateMinutes: task.estimateMinutes || 0,
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Update task
router.patch('/:id', [
  authenticateToken,
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim().notEmpty(),
  body('status').optional().isIn(['not_started', 'in_progress', 'paused', 'completed']),
  body('priority').optional().isIn(['high', 'medium', 'low']),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check permissions
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Employees can only update status
      const allowedFields = ['status'];
      const updateFields = Object.keys(req.body);
      const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasRestrictedFields) {
        return res.status(403).json({ error: 'Insufficient permissions for this update' });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
    ]);

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Start time tracking
router.post('/:id/time/start', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user is assigned to this task
    const isAssigned = task.assignedTo.some((assignee: any) => 
      assignee.toString() === req.user?._id.toString()
    );
    
    if (!isAssigned && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Check for existing active time log
    const existingLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (existingLog) {
      return res.status(400).json({ error: 'Time tracking already active for this task' });
    }

    const timeLog = new TimeLog({
      taskId: req.params.id,
      userId: req.user?._id,
      startTime: new Date(),
    });

    await timeLog.save();

    // Update task status to in_progress if not already
    if (task.status === 'not_started') {
      task.status = 'in_progress';
      await task.save();
    }

    res.json({ timeLog });
  } catch (error) {
    console.error('Start time tracking error:', error);
    res.status(500).json({ error: 'Failed to start time tracking' });
  }
});

// Stop time tracking
router.post('/:id/time/stop', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (!timeLog) {
      return res.status(400).json({ error: 'No active time tracking found' });
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - timeLog.startTime.getTime()) / 1000);

    timeLog.endTime = endTime;
    timeLog.durationSeconds = durationSeconds;
    await timeLog.save();

    res.json({ timeLog });
  } catch (error) {
    console.error('Stop time tracking error:', error);
    res.status(500).json({ error: 'Failed to stop time tracking' });
  }
});

export default router;