import express, { Response } from 'express';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createTaskSchema, updateTaskSchema } from '../validation/schemas.js';
import { PushService } from '../services/pushService.js';
import { TaskCarryoverService } from '../services/taskCarryoverService.js';
import { TimezoneUtils } from '../utils/timezone.js';
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
  validate(createTaskSchema),
], async (req: AuthRequest, res: Response) => {
  try {
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

    // Send notifications to assigned users
    if (task.assignedTo && task.assignedTo.length > 0) {
      const assigneeIds = task.assignedTo.map((user: any) => user._id.toString());
      
      await PushService.sendBulkNotification(assigneeIds, {
        type: 'task_assigned',
        title: 'New Task Assigned',
        body: `You have been assigned to "${task.title}"`,
        meta: { taskId: task._id },
      });
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
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

    return res.json({ 
      task, 
      timeLogs,
      stats: {
        totalTimeSeconds: totalTime,
        estimateMinutes: task.estimateMinutes || 0,
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Update task
router.patch('/:id', [
  authenticateToken,
  validate(updateTaskSchema),
], async (req: AuthRequest, res: Response) => {
  try {
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

    // Send notification if task is completed
    if (req.body.status === 'completed' && task.status !== 'completed' && updatedTask) {
      const creatorId = task.createdBy.toString();
      
      await PushService.sendNotification(creatorId, {
        type: 'task_completed',
        title: 'Task Completed',
        body: `"${updatedTask.title}" has been completed by ${req.user?.name}`,
        meta: { taskId: updatedTask._id },
      });
    }

    return res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
});

// Start time tracking
router.post('/:id/time/start', authenticateToken, async (req: AuthRequest, res: Response) => {
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
      startTime: TimezoneUtils.now(),
    });

    await timeLog.save();

    // Update task status to in_progress if not already
    if (task.status === 'not_started') {
      task.status = 'in_progress';
      await task.save();
    }

    return res.json({ timeLog });
  } catch (error) {
    console.error('Start time tracking error:', error);
    return res.status(500).json({ error: 'Failed to start time tracking' });
  }
});

// Stop time tracking
router.post('/:id/time/stop', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (!timeLog) {
      return res.status(400).json({ error: 'No active time tracking found' });
    }

    const endTime = TimezoneUtils.now();
    const durationSeconds = Math.floor((endTime.getTime() - timeLog.startTime.getTime()) / 1000);

    timeLog.endTime = endTime;
    timeLog.durationSeconds = durationSeconds;
    await timeLog.save();

    return res.json({ timeLog });
  } catch (error) {
    console.error('Stop time tracking error:', error);
    return res.status(500).json({ error: 'Failed to stop time tracking' });
  }
});

// Pause time tracking
router.post('/:id/time/pause', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (!timeLog) {
      return res.status(400).json({ error: 'No active time tracking found' });
    }

    // For pause functionality, we'll end the current log and create a new one when resumed
    const pauseTime = TimezoneUtils.now();
    const durationSeconds = Math.floor((pauseTime.getTime() - timeLog.startTime.getTime()) / 1000);

    timeLog.endTime = pauseTime;
    timeLog.durationSeconds = durationSeconds;
    await timeLog.save();

    return res.json({ timeLog, message: 'Timer paused' });
  } catch (error) {
    console.error('Pause time tracking error:', error);
    return res.status(500).json({ error: 'Failed to pause time tracking' });
  }
});

// Resume time tracking
router.post('/:id/time/resume', authenticateToken, async (req: AuthRequest, res: Response) => {
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
      startTime: TimezoneUtils.now(),
    });

    await timeLog.save();

    return res.json({ timeLog, message: 'Timer resumed' });
  } catch (error) {
    console.error('Resume time tracking error:', error);
    return res.status(500).json({ error: 'Failed to resume time tracking' });
  }
});

// Get task progress summary
router.get('/progress-summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const filter: any = {};
    
    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    // Get all tasks with filter
    const allTasks = await Task.find(filter);
    const totalTasks = allTasks.length;

    // Progress by priority
    const priorityStats = await Task.aggregate([
      { $match: filter },
      { $group: {
        _id: '$priority',
        count: { $sum: 1 },
        totalProgress: { $sum: { $ifNull: ['$progress.percentage', 0] } }
      }}
    ]);

    const byPriority = priorityStats.map(stat => ({
      priority: stat._id,
      count: stat.count,
      percentage: totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0,
      avgProgress: stat.count > 0 ? stat.totalProgress / stat.count : 0,
      totalTasks
    }));

    // Progress by status
    const statusStats = await Task.aggregate([
      { $match: filter },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalProgress: { $sum: { $ifNull: ['$progress.percentage', 0] } }
      }}
    ]);

    const byStatus = statusStats.map(stat => ({
      status: stat._id,
      count: stat.count,
      percentage: totalTasks > 0 ? (stat.count / totalTasks) * 100 : 0,
      avgProgress: stat.count > 0 ? stat.totalProgress / stat.count : 0,
      totalTasks
    }));

    // Overall progress calculation
    const overallProgressAgg = await Task.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalProgress: { $sum: { $ifNull: ['$progress.percentage', 0] } },
        count: { $sum: 1 }
      }}
    ]);

    const overallProgress = overallProgressAgg[0] ? 
      (overallProgressAgg[0].totalProgress / overallProgressAgg[0].count) : 0;

    // Completion rate
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      byPriority,
      byStatus,
      overallProgress: Math.round(overallProgress * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      totalTasks
    });
  } catch (error) {
    console.error('Get progress summary error:', error);
    res.status(500).json({ error: 'Failed to get progress summary' });
  }
});

// Get carryover statistics
router.get('/carryover-stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter: any = {};
    
    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const stats = await TaskCarryoverService.getCarryoverStats(
      req.user?.role === 'employee' ? req.user._id : undefined,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(stats);
  } catch (error) {
    console.error('Get carryover stats error:', error);
    res.status(500).json({ error: 'Failed to get carryover statistics' });
  }
});

// Get upcoming overdue tasks
router.get('/upcoming-overdue', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tasks = await TaskCarryoverService.getUpcomingOverdueTasks(
      req.user?.role === 'employee' ? req.user._id : undefined
    );

    res.json(tasks);
  } catch (error) {
    console.error('Get upcoming overdue tasks error:', error);
    res.status(500).json({ error: 'Failed to get upcoming overdue tasks' });
  }
});

export default router;
