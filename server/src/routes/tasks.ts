import express, { Response } from 'express';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createTaskSchema, updateTaskSchema } from '../validation/schemas.js';
import { PushService } from '../services/pushService.js';
import { TaskCarryoverService } from '../services/taskCarryoverService.js';
import { TimezoneUtils } from '../utils/timezone.js';
import { 
  startTaskTimer, 
  pauseTaskTimer, 
  completeTask, 
  calculateTaskTimeAndEfficiency 
} from '../utils/timeCalculations.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Helper function to calculate distance between two coordinates in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Helper function to validate location access
async function validateLocationAccess(taskId: string, userLat?: number, userLng?: number, isAdmin: boolean = false) {
  if (isAdmin) return true; // Admins can always access

  const task = await Task.findById(taskId);
  if (!task || !task.location) return true; // No location restriction

  if (!userLat || !userLng) {
    throw new Error('Location required to access this task');
  }

  const distance = calculateDistance(
    task.location.lat,
    task.location.lng,
    userLat,
    userLng
  );

  if (distance > (task.location.radiusMeters || 100)) {
    throw new Error(`You must be within ${task.location.radiusMeters || 100} meters of the task location`);
  }

  return true;
}

// Get all tasks
router.get('/', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { status, priority, assignee, page = 1, limit = 20 } = req.query;
    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'employee') {
      // Show tasks assigned to user individually or to their teams
      const userTeams = await Team.find({ members: req.user._id }).select('_id');
      const teamIds = userTeams.map((team: any) => team._id.toString());
      
      filter.$or = [
        { assignedTo: req.user._id },
        { assignedTeam: { $in: teamIds } }
      ];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee && req.user?.role === 'admin') filter.assignedTo = assignee;

    const skip = (Number(page) - 1) * Number(limit);

    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('assignedTeam', 'name description')
      .populate('approvals.by', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Add time and efficiency data for admins
    if (req.user?.role === 'admin') {
      const tasksWithStats = await Promise.all(
        tasks.map(async (task) => {
          const taskObj = task.toObject();
          const assignedUserIds = task.assignmentType === 'individual' 
            ? task.assignedTo?.filter((u: any) => u && u._id).map((u: any) => u._id.toString()) || []
            : [];
          
          if (assignedUserIds.length === 1) {
            try {
              const stats = await calculateTaskTimeAndEfficiency(task._id, assignedUserIds[0]);
              (taskObj as any).timeStats = stats;
            } catch (error) {
              console.warn('Error calculating time stats:', error);
            }
          }
          
          return taskObj;
        })
      );
      
      res.json({
        tasks: tasksWithStats,
        pagination: {
          total: await Task.countDocuments(filter),
          page: Number(page),
          pages: Math.ceil((await Task.countDocuments(filter)) / Number(limit)),
          limit: Number(limit),
        },
      });
      return;
    }

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
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvals.by', 'name email');

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee._id.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        res.status(403).json({ error: 'Access denied' });
        return;
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
router.put('/:id', [
  authenticateToken,
  validate(updateTaskSchema),
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Employees can only update status
      const allowedFields = ['status'];
      const updateFields = Object.keys(req.body);
      const hasRestrictedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasRestrictedFields) {
        res.status(403).json({ error: 'Insufficient permissions for this update' });
        return;
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

    res.json({ task: updatedTask });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Start time tracking
router.post('/:id/time/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        res.status(403).json({ error: 'You are not assigned to this task' });
        return;
      }
    }

    // Check if task has any active time logs
    const activeTimeLog = await TimeLog.findOne({
      taskId: req.params.id,
      endTime: { $exists: false }
    });

    if (activeTimeLog) {
      res.status(400).json({ error: 'Time tracking already active for this task' });
      return;
    }

    const timeLog = new TimeLog({
      taskId: req.params.id,
      userId: req.user?._id,
      startTime: TimezoneUtils.now(),
    });

    await timeLog.save();

    res.json({ timeLog });
  } catch (error) {
    console.error('Start time tracking error:', error);
    res.status(500).json({ error: 'Failed to start time tracking' });
  }
});

// Stop time tracking
router.post('/:id/time/stop', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (!timeLog) {
      res.status(400).json({ error: 'No active time tracking found' });
      return;
    }

    const endTime = TimezoneUtils.now();
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

// Pause time tracking
router.post('/:id/time/pause', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (!timeLog) {
      res.status(400).json({ error: 'No active time tracking found' });
      return;
    }

    // For pause functionality, we'll end the current log and create a new one when resumed
    const pauseTime = TimezoneUtils.now();
    const durationSeconds = Math.floor((pauseTime.getTime() - timeLog.startTime.getTime()) / 1000);

    timeLog.endTime = pauseTime;
    timeLog.durationSeconds = durationSeconds;
    await timeLog.save();

    res.json({ timeLog, message: 'Timer paused' });
  } catch (error) {
    console.error('Pause time tracking error:', error);
    res.status(500).json({ error: 'Failed to pause time tracking' });
  }
});

// Resume time tracking
router.post('/:id/time/resume', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user is assigned to this task
    const isAssigned = task.assignedTo.some((assignee: any) => 
      assignee.toString() === req.user?._id.toString()
    );
    
    if (!isAssigned && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'You are not assigned to this task' });
      return;
    }

    // Check for existing active time log
    const existingLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      endTime: null,
    });

    if (existingLog) {
      res.status(400).json({ error: 'Time tracking already active for this task' });
      return;
    }

    const timeLog = new TimeLog({
      taskId: req.params.id,
      userId: req.user?._id,
      startTime: TimezoneUtils.now(),
    });

    await timeLog.save();

    res.json({ timeLog, message: 'Timer resumed' });
  } catch (error) {
    console.error('Resume time tracking error:', error);
    res.status(500).json({ error: 'Failed to resume time tracking' });
  }
});

// Get task progress summary
router.get('/progress-summary', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
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
router.get('/carryover-stats', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
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
router.get('/upcoming-overdue', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
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

// Admin task deletion
router.delete('/:id', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Delete associated time logs
    await TimeLog.deleteMany({ taskId: task._id });

    // Delete the task
    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Admin task status change
router.patch('/:id/status', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    
    if (!['not_started', 'in_progress', 'paused', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignedTo', 'name email')
     .populate('assignedTeam', 'name description');

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Start task timer
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, address } = req.body;
    const taskId = req.params.id;
    const userId = req.user!._id;
    const isAdmin = req.user!.role === 'admin';

    const task = await Task.findById(taskId).populate('assignedTeam');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (!isAdmin) {
      if (task.assignmentType === 'team') {
        // Only team leader can start team tasks
        const team = await Team.findById(task.assignedTeam).populate('leader');
        if (!team || team.leader?._id.toString() !== userId) {
          res.status(403).json({ error: 'Only team leaders can start team tasks' });
          return;
        }
      } else {
        // Check if user is assigned to individual task
        if (!task.assignedTo.includes(userId)) {
          res.status(403).json({ error: 'You are not assigned to this task' });
          return;
        }
      }

      // Validate location if required
      await validateLocationAccess(taskId, latitude, longitude, isAdmin);
    }

    const location = latitude && longitude ? { latitude, longitude, address } : undefined;
    const timeLog = await startTaskTimer(taskId, userId, location);

    res.json({ timeLog, message: 'Task started successfully' });
  } catch (error: any) {
    console.error('Start task error:', error);
    res.status(400).json({ error: error.message || 'Failed to start task' });
  }
});

// Pause task timer
router.post('/:id/pause', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    const taskId = req.params.id;
    const userId = req.user!._id;
    const isAdmin = req.user!.role === 'admin';

    const task = await Task.findById(taskId).populate('assignedTeam');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (!isAdmin) {
      if (task.assignmentType === 'team') {
        const team = await Team.findById(task.assignedTeam).populate('leader');
        if (!team || team.leader?._id.toString() !== userId) {
          res.status(403).json({ error: 'Only team leaders can pause team tasks' });
          return;
        }
      } else {
        if (!task.assignedTo.includes(userId)) {
          res.status(403).json({ error: 'You are not assigned to this task' });
          return;
        }
      }

      // Validate location if required
      await validateLocationAccess(taskId, latitude, longitude, isAdmin);
    }

    const timeLog = await pauseTaskTimer(taskId, userId);

    res.json({ timeLog, message: 'Task paused successfully' });
  } catch (error: any) {
    console.error('Pause task error:', error);
    res.status(400).json({ error: error.message || 'Failed to pause task' });
  }
});

// Complete task
router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    const taskId = req.params.id;
    const userId = req.user!._id;
    const isAdmin = req.user!.role === 'admin';

    const task = await Task.findById(taskId).populate('assignedTeam');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check permissions
    if (!isAdmin) {
      if (task.assignmentType === 'team') {
        const team = await Team.findById(task.assignedTeam).populate('leader');
        if (!team || team.leader?._id.toString() !== userId) {
          res.status(403).json({ error: 'Only team leaders can complete team tasks' });
          return;
        }
      } else {
        if (!task.assignedTo.includes(userId)) {
          res.status(403).json({ error: 'You are not assigned to this task' });
          return;
        }
      }

      // Validate location if required
      await validateLocationAccess(taskId, latitude, longitude, isAdmin);
    }

    await completeTask(taskId, userId);

    res.json({ message: 'Task completed successfully' });
  } catch (error: any) {
    console.error('Complete task error:', error);
    res.status(400).json({ error: error.message || 'Failed to complete task' });
  }
});

// Get task time and efficiency (admin only)
router.get('/:id/analytics', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const analytics = await calculateTaskTimeAndEfficiency(taskId, userId as string);
    res.json(analytics);
  } catch (error) {
    console.error('Get task analytics error:', error);
    res.status(500).json({ error: 'Failed to get task analytics' });
  }
});
