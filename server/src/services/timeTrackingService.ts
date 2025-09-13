import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, addDays, format } from 'date-fns';
import TimeLog from '../models/TimeLog.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

export class TimeTrackingService {
  /**
   * Start time tracking for a task
   */
  static async startTimeTracking(userId: string, taskId: string, description?: string, estimatedDurationSeconds?: number) {
    // Stop any active time tracking for this user
    await this.stopActiveTimeTracking(userId);

    const timeLog = new TimeLog({
      userId,
      taskId,
      startTime: new Date(),
      isActive: true,
      description,
      estimatedDurationSeconds: estimatedDurationSeconds || 0,
      source: 'timer'
    });

    await timeLog.save();
    return timeLog.populate('taskId userId', 'title name email');
  }

  /**
   * Stop time tracking for a task
   */
  static async stopTimeTracking(timeLogId: string, description?: string) {
    const timeLog = await TimeLog.findById(timeLogId);
    if (!timeLog || !timeLog.isActive) {
      throw new Error('No active time tracking found');
    }

    timeLog.endTime = new Date();
    timeLog.isActive = false;
    if (description) {
      timeLog.description = description;
    }

    await timeLog.save();
    return timeLog.populate('taskId userId', 'title name email');
  }

  /**
   * Stop all active time tracking for a user
   */
  static async stopActiveTimeTracking(userId: string) {
    const activeLogs = await TimeLog.find({ userId, isActive: true });
    
    for (const log of activeLogs) {
      log.endTime = new Date();
      log.isActive = false;
      await log.save();
    }

    return activeLogs;
  }

  /**
   * Get active time tracking for a user
   */
  static async getActiveTimeTracking(userId: string) {
    return TimeLog.findOne({ userId, isActive: true })
      .populate('taskId userId', 'title name email priority status')
      .sort({ startTime: -1 });
  }

  /**
   * Log manual time entry
   */
  static async logManualTime(data: {
    userId: string;
    taskId: string;
    startTime: Date;
    endTime: Date;
    description?: string;
    tags?: string[];
    billable?: boolean;
  }) {
    const timeLog = new TimeLog({
      ...data,
      source: 'manual',
      isActive: false
    });

    await timeLog.save();
    return timeLog.populate('taskId userId', 'title name email');
  }

  /**
   * Log break time
   */
  static async logBreakTime(data: {
    userId: string;
    startTime: Date;
    endTime: Date;
    breakType: 'lunch' | 'coffee' | 'meeting' | 'other';
    description?: string;
  }) {
    // Create a dummy task ID for breaks or use a special break task
    const timeLog = new TimeLog({
      ...data,
      taskId: null, // Special case for breaks
      isBreak: true,
      source: 'manual',
      isActive: false,
      billable: false
    });

    await timeLog.save();
    return timeLog.populate('userId', 'name email');
  }

  /**
   * Get time logs for a user within date range
   */
  static async getTimeLogs(userId: string, startDate: Date, endDate: Date, options: {
    includeBreaks?: boolean;
    taskId?: string;
    billableOnly?: boolean;
  } = {}) {
    const query: any = {
      userId,
      startTime: { $gte: startDate, $lte: endDate }
    };

    if (!options.includeBreaks) {
      query.isBreak = { $ne: true };
    }

    if (options.taskId) {
      query.taskId = options.taskId;
    }

    if (options.billableOnly) {
      query.billable = true;
    }

    return TimeLog.find(query)
      .populate('taskId userId', 'title name email priority status')
      .sort({ startTime: -1 });
  }

  /**
   * Get daily time summary
   */
  static async getDailyTimeSummary(userId: string, date: Date) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const timeLogs = await this.getTimeLogs(userId, dayStart, dayEnd, { includeBreaks: true });

    const workLogs = timeLogs.filter(log => !log.isBreak);
    const breakLogs = timeLogs.filter(log => log.isBreak);

    const totalWorkTime = workLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
    const totalBreakTime = breakLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
    const billableTime = workLogs.filter(log => log.billable).reduce((sum, log) => sum + log.durationSeconds, 0);

    // Calculate efficiency
    const estimatedTime = workLogs.reduce((sum, log) => sum + (log.estimatedDurationSeconds || 0), 0);
    const efficiency = estimatedTime > 0 ? (estimatedTime / totalWorkTime) * 100 : 0;

    return {
      date,
      totalWorkTime: totalWorkTime / 3600, // in hours
      totalBreakTime: totalBreakTime / 3600, // in hours
      billableTime: billableTime / 3600, // in hours
      nonBillableTime: (totalWorkTime - billableTime) / 3600, // in hours
      efficiency,
      tasksWorked: [...new Set(workLogs.map(log => log.taskId?.toString()))].length,
      timeLogs: timeLogs.map(log => ({
        id: log._id,
        taskId: log.taskId,
        startTime: log.startTime,
        endTime: log.endTime,
        duration: log.durationSeconds / 3600, // in hours
        description: log.description,
        isBreak: log.isBreak,
        breakType: log.breakType,
        billable: log.billable,
        efficiency: log.efficiency,
        tags: log.tags
      }))
    };
  }

  /**
   * Get weekly time summary
   */
  static async getWeeklyTimeSummary(userId: string, weekStart: Date) {
    const weekEnd = endOfWeek(weekStart);
    const dailySummaries = [];

    // Get daily summaries for each day of the week
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const summary = await this.getDailyTimeSummary(userId, date);
      dailySummaries.push(summary);
    }

    const totalWorkTime = dailySummaries.reduce((sum, day) => sum + day.totalWorkTime, 0);
    const totalBreakTime = dailySummaries.reduce((sum, day) => sum + day.totalBreakTime, 0);
    const totalBillableTime = dailySummaries.reduce((sum, day) => sum + day.billableTime, 0);
    const avgEfficiency = dailySummaries.reduce((sum, day) => sum + day.efficiency, 0) / 7;

    return {
      weekStart,
      weekEnd,
      totalWorkTime,
      totalBreakTime,
      totalBillableTime,
      avgEfficiency,
      dailySummaries,
      workingDays: dailySummaries.filter(day => day.totalWorkTime > 0).length
    };
  }

  /**
   * Get task time analysis
   */
  static async getTaskTimeAnalysis(taskId: string) {
    const timeLogs = await TimeLog.find({ taskId, isBreak: { $ne: true } })
      .populate('userId', 'name email')
      .sort({ startTime: 1 });

    const task = await Task.findById(taskId);
    const totalActualTime = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
    const estimatedTime = (task?.estimateMinutes || 0) * 60;
    
    const variance = totalActualTime - estimatedTime;
    const variancePercentage = estimatedTime > 0 ? (variance / estimatedTime) * 100 : 0;
    const efficiency = estimatedTime > 0 ? (estimatedTime / totalActualTime) * 100 : 0;

    const userTimeBreakdown = timeLogs.reduce((breakdown, log) => {
      const userId = typeof log.userId === 'string' ? log.userId : String((log.userId as any)?._id || log.userId);
      if (!breakdown[userId]) {
        breakdown[userId] = {
          user: log.userId,
          totalTime: 0,
          sessions: 0
        };
      }
      breakdown[userId].totalTime += log.durationSeconds;
      breakdown[userId].sessions++;
      return breakdown;
    }, {} as any);

    return {
      taskId,
      task,
      totalActualTime: totalActualTime / 3600, // in hours
      estimatedTime: estimatedTime / 3600, // in hours
      variance: variance / 3600, // in hours
      variancePercentage,
      efficiency,
      totalSessions: timeLogs.length,
      firstLoggedTime: timeLogs[0]?.startTime,
      lastLoggedTime: timeLogs[timeLogs.length - 1]?.endTime,
      userBreakdown: Object.values(userTimeBreakdown),
      timeLogs: timeLogs.map(log => ({
        id: log._id,
        userId: log.userId,
        startTime: log.startTime,
        endTime: log.endTime,
        duration: log.durationSeconds / 3600, // in hours
        description: log.description,
        efficiency: log.efficiency,
        tags: log.tags
      }))
    };
  }

  /**
   * Get time tracking statistics for a user
   */
  static async getUserTimeStatistics(userId: string, days: number = 30) {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const timeLogs = await this.getTimeLogs(userId, startDate, endDate, { includeBreaks: false });

    const totalTime = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
    const billableTime = timeLogs.filter(log => log.billable).reduce((sum, log) => sum + log.durationSeconds, 0);
    const avgSessionTime = timeLogs.length > 0 ? totalTime / timeLogs.length : 0;

    // Calculate productivity trends
    const dailyStats = await Promise.all(
      Array.from({ length: days }, (_, i) => {
        const date = subDays(endDate, i);
        return this.getDailyTimeSummary(userId, date);
      })
    );

    const workingDays = dailyStats.filter(day => day.totalWorkTime > 0);
    const avgDailyHours = workingDays.length > 0 ? 
      workingDays.reduce((sum, day) => sum + day.totalWorkTime, 0) / workingDays.length : 0;

    return {
      period: { startDate, endDate, days },
      totalTime: totalTime / 3600, // in hours
      billableTime: billableTime / 3600, // in hours
      nonBillableTime: (totalTime - billableTime) / 3600, // in hours
      billablePercentage: totalTime > 0 ? (billableTime / totalTime) * 100 : 0,
      avgSessionTime: avgSessionTime / 3600, // in hours
      avgDailyHours,
      workingDays: workingDays.length,
      totalSessions: timeLogs.length,
      uniqueTasks: [...new Set(timeLogs.map(log => log.taskId?.toString()))].length,
      dailyStats: dailyStats.reverse() // Most recent first
    };
  }

  /**
   * Update time log
   */
  static async updateTimeLog(timeLogId: string, updates: {
    startTime?: Date;
    endTime?: Date;
    description?: string;
    tags?: string[];
    billable?: boolean;
  }) {
    const timeLog = await TimeLog.findByIdAndUpdate(
      timeLogId,
      { ...updates },
      { new: true, runValidators: true }
    ).populate('taskId userId', 'title name email');

    return timeLog;
  }

  /**
   * Delete time log
   */
  static async deleteTimeLog(timeLogId: string) {
    return TimeLog.findByIdAndDelete(timeLogId);
  }
}