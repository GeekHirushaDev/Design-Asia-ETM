import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permissionService.js';
import { AuthRequest } from '../types/index.js';

export const requirePermission = (module: string, action: string, resource: string = 'all') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasPermission = await PermissionService.hasPermission(
        req.user._id,
        module,
        action,
        resource
      );

      if (!hasPermission) {
        res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `${module}:${action}:${resource}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const checkTaskPermission = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Super admin has all permissions
    if (req.user.role === 'admin' && req.user.email === 'admin@company.com') {
      next();
      return;
    }

    const taskId = req.params.id || req.params.taskId;
    if (!taskId) {
      res.status(400).json({ error: 'Task ID required' });
      return;
    }

    // Import Task model here to avoid circular dependency
    const { default: Task } = await import('../models/Task.js');
    const { default: Team } = await import('../models/Team.js');
    
    const task = await Task.findById(taskId).populate('assignedTeam');
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Check if user has permission to access this task
    let hasAccess = false;

    if (task.assignmentType === 'individual') {
      // Individual task - check if user is assigned
      hasAccess = task.assignedTo.some((assigneeId: any) => 
        assigneeId.toString() === req.user!._id.toString()
      );
    } else if (task.assignmentType === 'team') {
      // Team task - check if user is team member or leader
      const team = await Team.findById(task.assignedTeam);
      if (team) {
        hasAccess = team.members.some((memberId: any) => 
          memberId.toString() === req.user!._id.toString()
        );
      }
    }

    // Check if user is the creator
    if (task.createdBy.toString() === req.user!._id.toString()) {
      hasAccess = true;
    }

    // Check role-based permissions
    if (!hasAccess) {
      const hasViewPermission = await PermissionService.hasPermission(
        req.user._id,
        'tasks',
        'view',
        'all'
      );
      hasAccess = hasViewPermission;
    }

    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied to this task' });
      return;
    }

    next();
  } catch (error) {
    console.error('Task permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
};