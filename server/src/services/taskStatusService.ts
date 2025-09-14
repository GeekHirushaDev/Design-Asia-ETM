import Task from '../models/Task.js';
import TaskStatusLog from '../models/TaskStatusLog.js';
import TimeLog from '../models/TimeLog.js';
import Team from '../models/Team.js';
import { TimezoneUtils } from '../utils/timezone.js';
import { LocationService } from './locationService.js';

export class TaskStatusService {
  /**
   * Validate status transition
   */
  static validateStatusTransition(fromStatus: string, toStatus: string): boolean {
    const validTransitions: { [key: string]: string[] } = {
      'not_started': ['in_progress'],
      'in_progress': ['paused', 'completed'],
      'paused': ['in_progress', 'completed'],
      'completed': [], // No transitions from completed
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Check if user can control task status
   */
  static async canControlTaskStatus(taskId: string, userId: string): Promise<{ canControl: boolean; reason?: string }> {
    try {
      const task = await Task.findById(taskId).populate('assignedTeam');
      if (!task) {
        return { canControl: false, reason: 'Task not found' };
      }

      // Admin can always control
      const user = await import('../models/User.js').then(m => m.default.findById(userId));
      if (user?.role === 'admin') {
        return { canControl: true };
      }

      if (task.assignmentType === 'individual') {
        // Individual task - only assigned users can control
        const isAssigned = task.assignedTo.some((assigneeId: any) => 
          assigneeId.toString() === userId
        );
        return { 
          canControl: isAssigned, 
          reason: isAssigned ? undefined : 'Not assigned to this task' 
        };
      } else if (task.assignmentType === 'team') {
        // Team task - only team leader can control
        const team = await Team.findById(task.assignedTeam);
        if (!team) {
          return { canControl: false, reason: 'Team not found' };
        }

        const isLeader = team.leader?.toString() === userId;
        return { 
          canControl: isLeader, 
          reason: isLeader ? undefined : 'Only team leader can control team tasks' 
        };
      }

      return { canControl: false, reason: 'Invalid assignment type' };
    } catch (error) {
      console.error('Error checking task control permission:', error);
      return { canControl: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Change task status with validation and logging
   */
  static async changeTaskStatus(
    taskId: string, 
    userId: string, 
    newStatus: string, 
    location?: { latitude: number; longitude: number; address?: string },
    notes?: string
  ): Promise<any> {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const currentStatus = task.status;

      // Validate transition
      if (!this.validateStatusTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Check user permissions
      const { canControl, reason } = await this.canControlTaskStatus(taskId, userId);
      if (!canControl) {
        throw new Error(reason || 'Access denied');
      }

      // Validate location if task requires it
      if (task.location && location) {
        const isWithinRadius = await LocationService.validateLocation(
          task.location.lat,
          task.location.lng,
          task.location.radiusMeters || 100,
          location.latitude,
          location.longitude
        );

        if (!isWithinRadius) {
          throw new Error(`You must be within ${task.location.radiusMeters || 100} meters of the task location`);
        }
      }

      // Handle time tracking based on status change
      await this.handleTimeTracking(taskId, userId, currentStatus, newStatus, location);

      // Update task status
      task.status = newStatus;
      await task.save();

      // Log status change
      const statusLog = new TaskStatusLog({
        taskId,
        userId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        timestamp: TimezoneUtils.now(),
        location,
        notes,
      });
      await statusLog.save();

      return task;
    } catch (error) {
      console.error('Change task status error:', error);
      throw error;
    }
  }

  /**
   * Handle time tracking for status changes
   */
  private static async handleTimeTracking(
    taskId: string, 
    userId: string, 
    fromStatus: string, 
    toStatus: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<void> {
    try {
      if (toStatus === 'in_progress') {
        // Starting or resuming - create new time log
        const timeLog = new TimeLog({
          taskId,
          userId,
          startTime: TimezoneUtils.now(),
          isActive: true,
          source: 'auto',
          location,
        });
        await timeLog.save();
      } else if (fromStatus === 'in_progress' && (toStatus === 'paused' || toStatus === 'completed')) {
        // Pausing or completing - end current time log
        const activeTimeLog = await TimeLog.findOne({
          taskId,
          userId,
          isActive: true,
          endTime: { $exists: false },
        });

        if (activeTimeLog) {
          activeTimeLog.endTime = TimezoneUtils.now();
          activeTimeLog.isActive = false;
          await activeTimeLog.save();
        }
      }
    } catch (error) {
      console.error('Time tracking error:', error);
      // Don't throw - status change should still succeed even if time tracking fails
    }
  }

  /**
   * Get task status history
   */
  static async getTaskStatusHistory(taskId: string): Promise<any[]> {
    try {
      const statusLogs = await TaskStatusLog.find({ taskId })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 });

      return statusLogs;
    } catch (error) {
      console.error('Get task status history error:', error);
      return [];
    }
  }

  /**
   * Calculate task time and efficiency
   */
  static async calculateTaskTimeAndEfficiency(taskId: string, userId?: string): Promise<any> {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      const filter: any = { taskId, isActive: false, endTime: { $exists: true } };
      if (userId) {
        filter.userId = userId;
      }

      const timeLogs = await TimeLog.find(filter).sort({ startTime: 1 });

      // Calculate total time
      const totalSeconds = timeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
      const totalMinutes = Math.round(totalSeconds / 60);
      const totalHours = totalMinutes / 60;

      // Calculate efficiency
      const estimatedMinutes = task.estimateMinutes || 0;
      let efficiency = 0;
      if (estimatedMinutes > 0 && totalMinutes > 0) {
        efficiency = (estimatedMinutes / totalMinutes) * 100;
      }

      return {
        taskId,
        userId,
        totalSeconds,
        totalMinutes,
        totalHours: Math.round(totalHours * 100) / 100,
        estimatedMinutes,
        efficiency: Math.round(efficiency * 100) / 100,
        timeLogs: timeLogs.length,
        sessions: timeLogs.map(log => ({
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.durationSeconds,
          location: log.location,
        })),
      };
    } catch (error) {
      console.error('Calculate task time error:', error);
      throw error;
    }
  }
}