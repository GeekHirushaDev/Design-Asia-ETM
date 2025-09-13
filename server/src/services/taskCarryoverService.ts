import Task from '../models/Task.js';
import { startOfDay, endOfDay, addDays } from 'date-fns';

export class TaskCarryoverService {
  /**
   * Automatically carry over pending/in-progress tasks to the next day
   */
  static async carryOverPendingTasks(): Promise<void> {
    try {
      const yesterday = addDays(new Date(), -1);
      const startOfYesterday = startOfDay(yesterday);
      const endOfYesterday = endOfDay(yesterday);

      // Find tasks that were due yesterday but not completed
      const pendingTasks = await Task.find({
        dueDate: {
          $gte: startOfYesterday,
          $lte: endOfYesterday
        },
        status: { $in: ['not_started', 'in_progress', 'paused'] }
      });

      console.log(`Found ${pendingTasks.length} pending tasks to carry over`);

      for (const task of pendingTasks) {
        const newDueDate = addDays(task.dueDate!, 1);
        const carryoverInfo = {
          from: task.dueDate!,
          to: newDueDate,
          reason: 'Auto carryover - task not completed',
          carriedAt: new Date()
        };

        await Task.findByIdAndUpdate(task._id, {
          dueDate: newDueDate,
          'carryoverInfo.isCarriedOver': true,
          'carryoverInfo.originalDueDate': task.carryoverInfo?.originalDueDate || task.dueDate,
          $inc: { 'carryoverInfo.carryoverCount': 1 },
          $push: { 'carryoverInfo.carryoverHistory': carryoverInfo }
        });

        console.log(`Carried over task: ${task.title} from ${task.dueDate} to ${newDueDate}`);
      }
    } catch (error) {
      console.error('Error in task carryover:', error);
      throw error;
    }
  }

  /**
   * Get carryover statistics for reporting
   */
  static async getCarryoverStats(userId?: string, startDate?: Date, endDate?: Date) {
    const filter: any = {};
    
    if (userId) {
      filter.$or = [
        { createdBy: userId },
        { assignedTo: userId }
      ];
    }

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const totalTasks = await Task.countDocuments(filter);
    const carriedOverTasks = await Task.countDocuments({
      ...filter,
      'carryoverInfo.isCarriedOver': true
    });

    const avgCarryoverCount = await Task.aggregate([
      { $match: { ...filter, 'carryoverInfo.isCarriedOver': true } },
      { $group: { _id: null, avgCount: { $avg: '$carryoverInfo.carryoverCount' } } }
    ]);

    return {
      totalTasks,
      carriedOverTasks,
      carryoverRate: totalTasks > 0 ? (carriedOverTasks / totalTasks) * 100 : 0,
      averageCarryoverCount: avgCarryoverCount[0]?.avgCount || 0
    };
  }

  /**
   * Get upcoming tasks that might need carryover
   */
  static async getUpcomingOverdueTasks(userId?: string) {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    const filter: any = {
      dueDate: { $lt: tomorrow },
      status: { $in: ['not_started', 'in_progress', 'paused'] }
    };

    if (userId) {
      filter.$or = [
        { createdBy: userId },
        { assignedTo: userId }
      ];
    }

    return await Task.find(filter)
      .populate('createdBy assignedTo', 'name email')
      .sort({ dueDate: 1 })
      .limit(50);
  }
}