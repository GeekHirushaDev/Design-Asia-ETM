import { startOfWeek, endOfWeek, format, addWeeks } from 'date-fns';
import Task from '../models/Task.js';
import User from '../models/User.js';
import TimeLog from '../models/TimeLog.js';
import Attendance from '../models/Attendance.js';

export class WeeklyReportService {
  /**
   * Generate comprehensive weekly task review report
   */
  static async generateWeeklyTaskReport(weekOffset = 0, userId?: string) {
    const now = new Date();
    const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });

    // Filter for specific user if provided
    const userFilter = userId ? 
      { $or: [{ createdBy: userId }, { assignedTo: userId }] } : {};

    // Get tasks for the week
    const tasks = await Task.find({
      ...userFilter,
      $or: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } },
        { dueDate: { $gte: weekStart, $lte: weekEnd } },
        { updatedAt: { $gte: weekStart, $lte: weekEnd } }
      ]
    })
    .populate('createdBy assignedTo', 'name email')
    .sort({ dueDate: 1 });

    // Get time logs for the week
    const timeLogs = await TimeLog.find({
      ...userFilter,
      startTime: { $gte: weekStart, $lte: weekEnd }
    })
    .populate('taskId userId', 'title name');

    // Get attendance for the week
    const attendance = await Attendance.find({
      ...userFilter,
      date: { $gte: weekStart, $lte: weekEnd }
    })
    .populate('userId', 'name email');

    // Calculate metrics
    const metrics = await this.calculateWeeklyMetrics(tasks, timeLogs, attendance);
    const timeTracking = await this.calculateTimeTrackingComparison(tasks, timeLogs);
    const productivity = await this.calculateProductivityMetrics(tasks, timeLogs, weekStart, weekEnd);

    return {
      period: {
        start: weekStart,
        end: weekEnd,
        week: format(weekStart, 'W'),
        year: format(weekStart, 'yyyy')
      },
      summary: metrics,
      timeTracking,
      productivity,
      tasks: {
        all: tasks,
        byStatus: this.groupTasksByStatus(tasks),
        byPriority: this.groupTasksByPriority(tasks),
        byAssignee: this.groupTasksByAssignee(tasks)
      },
      timeLogs,
      attendance
    };
  }

  /**
   * Calculate weekly metrics
   */
  static async calculateWeeklyMetrics(tasks: any[], timeLogs: any[], attendance: any[]) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    const totalTimeSpent = timeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
    const avgTimePerTask = completedTasks > 0 ? totalTimeSpent / completedTasks : 0;

    const workingDays = attendance.filter(a => a.clockIn && a.clockOut).length;
    const attendanceRate = attendance.length > 0 ? (workingDays / attendance.length) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalTimeSpent: totalTimeSpent / 3600, // in hours
      avgTimePerTask: avgTimePerTask / 3600, // in hours
      workingDays,
      attendanceRate
    };
  }

  /**
   * Calculate estimated vs actual time comparison
   */
  static async calculateTimeTrackingComparison(tasks: any[], timeLogs: any[]) {
    const taskTimeComparisons = [];
    
    for (const task of tasks) {
      const taskTimeLogs = timeLogs.filter(log => 
        log.taskId && log.taskId._id && log.taskId._id.toString() === task._id.toString()
      );
      
      const actualTimeSpent = taskTimeLogs.reduce((sum, log) => sum + (log.durationSeconds || 0), 0);
      const estimatedTime = (task.estimateMinutes || 0) * 60; // Convert to seconds
      
      const variance = actualTimeSpent - estimatedTime;
      const variancePercentage = estimatedTime > 0 ? (variance / estimatedTime) * 100 : 0;

      taskTimeComparisons.push({
        taskId: task._id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        estimatedTime: estimatedTime / 3600, // in hours
        actualTime: actualTimeSpent / 3600, // in hours
        variance: variance / 3600, // in hours
        variancePercentage,
        efficiency: estimatedTime > 0 ? (estimatedTime / actualTimeSpent) * 100 : 0
      });
    }

    // Overall statistics
    const totalEstimated = taskTimeComparisons.reduce((sum, t) => sum + t.estimatedTime, 0);
    const totalActual = taskTimeComparisons.reduce((sum, t) => sum + t.actualTime, 0);
    const overallVariance = totalActual - totalEstimated;
    const overallVariancePercentage = totalEstimated > 0 ? (overallVariance / totalEstimated) * 100 : 0;

    return {
      byTask: taskTimeComparisons,
      overall: {
        totalEstimated,
        totalActual,
        variance: overallVariance,
        variancePercentage: overallVariancePercentage,
        efficiency: totalEstimated > 0 ? (totalEstimated / totalActual) * 100 : 0
      }
    };
  }

  /**
   * Calculate productivity metrics
   */
  static async calculateProductivityMetrics(tasks: any[], timeLogs: any[], weekStart: Date, weekEnd: Date) {
    // Tasks completed per day
    const completedByDay: { [key: string]: number } = {};
    const timeSpentByDay: { [key: string]: number } = {};
    
    tasks.filter(t => t.status === 'completed').forEach(task => {
      if (task.updatedAt >= weekStart && task.updatedAt <= weekEnd) {
        const day = format(task.updatedAt, 'yyyy-MM-dd');
        completedByDay[day] = (completedByDay[day] || 0) + 1;
      }
    });

    timeLogs.forEach(log => {
      const day = format(log.startTime, 'yyyy-MM-dd');
      timeSpentByDay[day] = (timeSpentByDay[day] || 0) + (log.durationSeconds || 0);
    });

    // Calculate productivity score (tasks completed / time spent)
    const productivityByDay: { [key: string]: number } = {};
    Object.keys(timeSpentByDay).forEach(day => {
      const completed = completedByDay[day] || 0;
      const timeSpent = timeSpentByDay[day] / 3600; // in hours
      productivityByDay[day] = timeSpent > 0 ? completed / timeSpent : 0;
    });

    // Priority-based metrics
    const priorityMetrics = {
      high: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      low: { completed: 0, total: 0 }
    };

    tasks.forEach(task => {
      if (task.priority && priorityMetrics[task.priority as keyof typeof priorityMetrics]) {
        priorityMetrics[task.priority as keyof typeof priorityMetrics].total++;
        if (task.status === 'completed') {
          priorityMetrics[task.priority as keyof typeof priorityMetrics].completed++;
        }
      }
    });

    return {
      completedByDay,
      timeSpentByDay: Object.fromEntries(
        Object.entries(timeSpentByDay).map(([day, seconds]) => [day, seconds / 3600])
      ),
      productivityByDay,
      priorityMetrics,
      averageProductivity: Object.values(productivityByDay).reduce((sum, p) => sum + p, 0) / Object.keys(productivityByDay).length || 0
    };
  }

  /**
   * Group tasks by status
   */
  static groupTasksByStatus(tasks: any[]) {
    return tasks.reduce((groups, task) => {
      const status = task.status;
      if (!groups[status]) groups[status] = [];
      groups[status].push(task);
      return groups;
    }, {});
  }

  /**
   * Group tasks by priority
   */
  static groupTasksByPriority(tasks: any[]) {
    return tasks.reduce((groups, task) => {
      const priority = task.priority;
      if (!groups[priority]) groups[priority] = [];
      groups[priority].push(task);
      return groups;
    }, {});
  }

  /**
   * Group tasks by assignee
   */
  static groupTasksByAssignee(tasks: any[]) {
    return tasks.reduce((groups, task) => {
      task.assignedTo.forEach((user: any) => {
        const userId = user._id.toString();
        if (!groups[userId]) groups[userId] = { user, tasks: [] };
        groups[userId].tasks.push(task);
      });
      return groups;
    }, {});
  }

  /**
   * Compare current week with previous week
   */
  static async generateWeeklyComparison(userId?: string) {
    const [currentWeek, previousWeek] = await Promise.all([
      this.generateWeeklyTaskReport(0, userId),
      this.generateWeeklyTaskReport(-1, userId)
    ]);

    const comparison = {
      tasks: {
        total: {
          current: currentWeek.summary.totalTasks,
          previous: previousWeek.summary.totalTasks,
          change: currentWeek.summary.totalTasks - previousWeek.summary.totalTasks
        },
        completed: {
          current: currentWeek.summary.completedTasks,
          previous: previousWeek.summary.completedTasks,
          change: currentWeek.summary.completedTasks - previousWeek.summary.completedTasks
        },
        completionRate: {
          current: currentWeek.summary.completionRate,
          previous: previousWeek.summary.completionRate,
          change: currentWeek.summary.completionRate - previousWeek.summary.completionRate
        }
      },
      time: {
        totalSpent: {
          current: currentWeek.summary.totalTimeSpent,
          previous: previousWeek.summary.totalTimeSpent,
          change: currentWeek.summary.totalTimeSpent - previousWeek.summary.totalTimeSpent
        },
        efficiency: {
          current: currentWeek.timeTracking.overall.efficiency,
          previous: previousWeek.timeTracking.overall.efficiency,
          change: currentWeek.timeTracking.overall.efficiency - previousWeek.timeTracking.overall.efficiency
        }
      },
      productivity: {
        current: currentWeek.productivity.averageProductivity,
        previous: previousWeek.productivity.averageProductivity,
        change: currentWeek.productivity.averageProductivity - previousWeek.productivity.averageProductivity
      }
    };

    return {
      currentWeek,
      previousWeek,
      comparison
    };
  }
}