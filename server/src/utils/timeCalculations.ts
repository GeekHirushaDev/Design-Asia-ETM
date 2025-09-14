import TimeLog from '../models/TimeLog.js';
import Task from '../models/Task.js';

interface TimeInterval {
  from: Date;
  to: Date;
}

// Merge overlapping time intervals
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (!intervals.length) return [];
  
  const sorted = intervals
    .map(i => ({ from: i.from.getTime(), to: i.to.getTime() }))
    .sort((a, b) => a.from - b.from);
  
  const merged = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    if (current.from <= last.to) {
      // Overlapping intervals - extend the last one
      last.to = Math.max(last.to, current.to);
    } else {
      // No overlap - add new interval
      merged.push(current);
    }
  }
  
  return merged.map(m => ({ from: new Date(m.from), to: new Date(m.to) }));
}

// Calculate total duration in minutes from intervals
export function totalDurationMinutes(intervals: TimeInterval[]): number {
  const merged = mergeIntervals(intervals);
  const totalMs = merged.reduce((sum, interval) => {
    return sum + Math.max(0, interval.to.getTime() - interval.from.getTime());
  }, 0);
  
  return Math.round(totalMs / 60000); // Convert to minutes
}

// Calculate efficiency percentage
export function efficiencyPercent(estimatedMinutes: number, actualMinutes: number): number | null {
  if (!estimatedMinutes) return null; // No estimate available
  if (!actualMinutes) return 0; // No time spent
  
  return +(estimatedMinutes / actualMinutes * 100).toFixed(1);
}

// Get color for efficiency visualization
export function getEfficiencyColor(efficiency: number | null): string {
  if (efficiency === null) return '#6B7280'; // Gray for no data
  if (efficiency >= 125) return '#10B981'; // Green - much faster
  if (efficiency >= 100) return '#3B82F6'; // Blue - on target/faster
  if (efficiency >= 75) return '#F59E0B';  // Amber - slightly over
  return '#EF4444'; // Red - much slower
}

// Calculate task time and efficiency for a specific user
export async function calculateTaskTimeAndEfficiency(taskId: string, userId: string) {
  try {
    // Fetch time logs for this task and user
    const timeLogs = await TimeLog.find({
      taskId,
      userId,
      endTime: { $exists: true } // Only completed time logs
    })
    .select('startTime endTime')
    .lean();

    // Convert to intervals
    const intervals: TimeInterval[] = timeLogs.map(log => ({
      from: new Date(log.startTime),
      to: new Date(log.endTime!)
    }));

    // Calculate actual time spent
    const actualMinutes = totalDurationMinutes(intervals);

    // Get task estimate
    const task = await Task.findById(taskId).select('estimateMinutes priority').lean();
    const estimatedMinutes = task?.estimateMinutes ?? 0;

    // Calculate efficiency
    const efficiency = efficiencyPercent(estimatedMinutes, actualMinutes);

    return {
      taskId,
      userId,
      estimatedMinutes,
      actualMinutes,
      efficiency,
      efficiencyColor: getEfficiencyColor(efficiency),
      priority: task?.priority,
      timeSpent: formatDuration(actualMinutes)
    };
  } catch (error) {
    console.error('Error calculating task time and efficiency:', error);
    throw error;
  }
}

// Format duration for display
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

// Start a new time log for a task
export async function startTaskTimer(taskId: string, userId: string, location?: { latitude: number; longitude: number; address: string }) {
  try {
    // Check if there's already an active timer for this user and task
    const activeTimer = await TimeLog.findOne({
      taskId,
      userId,
      isActive: true,
      endTime: { $exists: false }
    });

    if (activeTimer) {
      throw new Error('Timer is already running for this task');
    }

    // Create new time log
    const timeLog = new TimeLog({
      taskId,
      userId,
      source: 'timer',
      isActive: true,
      location
    });

    await timeLog.save();

    // Update task status to in_progress
    await Task.findByIdAndUpdate(taskId, { status: 'in_progress' });

    return timeLog;
  } catch (error) {
    console.error('Error starting task timer:', error);
    throw error;
  }
}

// Pause/stop a timer
export async function pauseTaskTimer(taskId: string, userId: string) {
  try {
    const activeTimer = await TimeLog.findOne({
      taskId,
      userId,
      isActive: true,
      endTime: { $exists: false }
    });

    if (!activeTimer) {
      throw new Error('No active timer found for this task');
    }

    // Set end time and mark as inactive
    activeTimer.endTime = new Date();
    activeTimer.isActive = false;
    await activeTimer.save();

    // Update task status to paused
    await Task.findByIdAndUpdate(taskId, { status: 'paused' });

    return activeTimer;
  } catch (error) {
    console.error('Error pausing task timer:', error);
    throw error;
  }
}

// Complete a task
export async function completeTask(taskId: string, userId: string) {
  try {
    // Pause any active timer
    const activeTimer = await TimeLog.findOne({
      taskId,
      userId,
      isActive: true,
      endTime: { $exists: false }
    });

    if (activeTimer) {
      activeTimer.endTime = new Date();
      activeTimer.isActive = false;
      await activeTimer.save();
    }

    // Update task status to completed
    await Task.findByIdAndUpdate(taskId, { status: 'completed' });

    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
}