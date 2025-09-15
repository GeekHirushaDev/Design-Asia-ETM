import express, { Response } from 'express';
import Task from '../models/Task.js';
import TimeLog from '../models/TimeLog.js';
import TaskStatusLog from '../models/TaskStatusLog.js';
import User from '../models/User.js';
import Location from '../models/Location.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { requirePermission, checkTaskPermission } from '../middleware/permissions.js';
import { validate } from '../middleware/validation.js';
import { createTaskSchema, updateTaskSchema } from '../validation/schemas.js';
import { PushService } from '../services/pushService.js';
import { TaskCarryoverService } from '../services/taskCarryoverService.js';
import { TaskStatusService } from '../services/taskStatusService.js';
import { TimezoneUtils } from '../utils/timezone.js';
import { 
  startTaskTimer, 
  pauseTaskTimer, 
  completeTask, 
  calculateTaskTimeAndEfficiency 
} from '../utils/timeCalculations.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Utility function to validate location access for tasks
async function validateLocationAccess(
  taskId: string, 
  latitude: number, 
  longitude: number, 
  isAdmin: boolean
): Promise<void> {
  if (isAdmin) {
    return; // Admin can override location restrictions
  }

  const task = await Task.findById(taskId).populate('location');
  if (!task || !task.location) {
    return; // No location requirement
  }

  const taskLocation = task.location as any;
  
  // Calculate distance using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = (latitude - taskLocation.latitude) * Math.PI / 180;
  const dLon = (longitude - taskLocation.longitude) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(taskLocation.latitude * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1000; // Distance in meters

  const radiusMeters = taskLocation.radiusMeters || 100;
  
  if (distance > radiusMeters) {
    throw new Error(`You must be within ${radiusMeters}m of the required location. Current distance: ${Math.round(distance)}m`);
  }
}

// Get all tasks
router.get('/', [
  authenticateToken,
  requirePermission('tasks', 'view', 'all')
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, assignee, page = 1, limit = 20 } = req.query;
    const filter: any = {};

    // Role-based filtering (teams removed) – employees see only individually assigned tasks
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
      // Teams removed
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
  requirePermission('tasks', 'insert', 'all'),
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
router.get('/:id', [
  authenticateToken,
  checkTaskPermission
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvals.by', 'name email');

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to get task' });
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
  requirePermission('tasks', 'delete', 'all'),
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
  requirePermission('tasks', 'update', 'all'),
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
  checkTaskPermission,
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;
    const userId = req.query.userId as string || req.user!._id;

    const analytics = await TaskStatusService.calculateTaskTimeAndEfficiency(taskId, userId);
    res.json(analytics);
  } catch (error) {
    console.error('Get task analytics error:', error);
    res.status(500).json({ error: 'Failed to get task analytics' });
  }
});

// Get task status history
router.get('/:id/status-history', [
  authenticateToken,
  checkTaskPermission
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const history = await TaskStatusService.getTaskStatusHistory(req.params.id);
    res.json({ history });
  } catch (error) {
    console.error('Get task status history error:', error);
    res.status(500).json({ error: 'Failed to get task status history' });
  }
});

// Get active time log for a task
router.get('/:id/time/active', [
  authenticateToken,
  checkTaskPermission
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const timeLog = await TimeLog.findOne({
      taskId: req.params.id,
      userId: req.user?._id,
      isActive: true,
      endTime: { $exists: false },
    });

    if (!timeLog) {
      res.status(404).json({ message: 'No active time tracking found' });
      return;
    }

    res.json({ timeLog });
  } catch (error) {
    console.error('Get active time log error:', error);
    res.status(500).json({ error: 'Failed to get active time log' });
  }
});
