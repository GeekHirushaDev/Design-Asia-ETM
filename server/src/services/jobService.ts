import { Queue, Worker } from 'bullmq';
import { config } from '../config/config.js';
import { PDFService } from './pdfService.js';
import { PushService } from './pushService.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import TimeLog from '../models/TimeLog.js';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from 'date-fns';

// Redis connection configuration for BullMQ
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Job queues
export const reportQueue = new Queue('report-generation', { connection: redisConnection });
export const notificationQueue = new Queue('notifications', { connection: redisConnection });
export const maintenanceQueue = new Queue('maintenance', { connection: redisConnection });

// Report generation worker
const reportWorker = new Worker('report-generation', async (job) => {
  const { type, config, userId } = job.data;
  
  try {
    let reportData;
    let pdfBuffer: Buffer;
    
    switch (type) {
      case 'weekly':
        reportData = await generateWeeklyReportData();
        pdfBuffer = await PDFService.generateTaskReport(reportData);
        break;
        
      case 'attendance':
        reportData = await generateAttendanceReportData(config);
        pdfBuffer = await PDFService.generateAttendanceReport(reportData);
        break;
        
      case 'task_performance':
        reportData = await generateTaskPerformanceReportData(config);
        pdfBuffer = await PDFService.generateTaskReport(reportData);
        break;
        
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
    
    // In a real implementation, you would save the PDF to S3 or file system
    // For now, we'll just return the data
    return {
      reportId: `${type}-${Date.now()}`,
      data: reportData,
      pdfSize: pdfBuffer.length,
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
}, { connection: redisConnection });

// Notification worker
const notificationWorker = new Worker('notifications', async (job) => {
  const { type, userIds, notification } = job.data;
  
  try {
    if (type === 'bulk') {
      await PushService.sendBulkNotification(userIds, notification);
    } else {
      await PushService.sendNotification(userIds[0], notification);
    }
  } catch (error) {
    console.error('Notification job failed:', error);
    throw error;
  }
}, { connection: redisConnection });

// Maintenance worker
const maintenanceWorker = new Worker('maintenance', async (job) => {
  const { type } = job.data;
  
  try {
    switch (type) {
      case 'auto_carryover_tasks':
        await autoCarryoverTasks();
        break;
        
      case 'send_overdue_reminders':
        await sendOverdueReminders();
        break;
        
      case 'cleanup_old_sessions':
        await cleanupOldSessions();
        break;
        
      case 'generate_weekly_reports':
        await scheduleWeeklyReports();
        break;
        
      default:
        console.log(`Unknown maintenance job: ${type}`);
    }
  } catch (error) {
    console.error('Maintenance job failed:', error);
    throw error;
  }
}, { connection: redisConnection });

// Helper functions
async function generateWeeklyReportData() {
  const startDate = startOfWeek(new Date());
  const endDate = endOfWeek(new Date());
  
  const [tasks, users, attendance, timeLogs] = await Promise.all([
    Task.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('createdBy assignedTo', 'name email'),
    User.find({ role: 'employee' }),
    Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).populate('userId', 'name email'),
    TimeLog.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('userId taskId', 'name title')
  ]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overdueTasks = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;

  return {
    type: 'weekly',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    kpis: {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueTasks,
      totalWorkingHours: timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0) / 3600,
    },
    tasks: tasks.map(task => ({
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo.map((u: any) => u.name).join(', '),
      createdAt: task.createdAt,
    })),
    topPerformers: users.slice(0, 5).map(user => ({
      name: user.name,
      tasksCompleted: tasks.filter(t => 
        t.status === 'completed' && 
        t.assignedTo.some((u: any) => u._id.toString() === user._id.toString())
      ).length,
      hoursWorked: timeLogs
        .filter(log => log.userId.toString() === user._id.toString())
        .reduce((sum, log) => sum + log.durationSeconds, 0) / 3600
    })),
  };
}

async function generateAttendanceReportData(config: any) {
  const startDate = new Date(config.dateRange.start);
  const endDate = new Date(config.dateRange.end);
  
  const attendance = await Attendance.find({
    date: { $gte: startDate, $lte: endDate },
    ...(config.filters.userId && { userId: config.filters.userId })
  }).populate('userId', 'name email');

  const totalRecords = attendance.length;
  const presentDays = attendance.filter(a => a.clockIn && a.clockOut).length;
  const rate = totalRecords > 0 ? (presentDays / totalRecords) * 100 : 0;

  return {
    type: 'attendance',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    summary: {
      totalRecords,
      presentDays,
      rate,
    },
    attendance,
  };
}

async function generateTaskPerformanceReportData(config: any) {
  const startDate = new Date(config.dateRange.start);
  const endDate = new Date(config.dateRange.end);
  
  const tasks = await Task.find({
    createdAt: { $gte: startDate, $lte: endDate },
    ...(config.filters.priority && { priority: config.filters.priority }),
    ...(config.filters.status && { status: config.filters.status }),
    ...(config.filters.userId && { assignedTo: config.filters.userId })
  }).populate('createdBy assignedTo', 'name email');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const overdueTasks = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
  ).length;

  return {
    type: 'task_performance',
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    kpis: {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      overdueTasks,
    },
    tasks: tasks.map(task => ({
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo.map((u: any) => u.name).join(', '),
      createdAt: task.createdAt,
    })),
  };
}

// Auto-carryover incomplete tasks to today (runs at 00:05 Asia/Colombo)
async function autoCarryoverTasks() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Find incomplete tasks that were due yesterday or earlier
  const incompleteTasks = await Task.find({
    status: { $nin: ['completed'] },
    dueDate: { $lt: today },
    updatedAt: { $lt: today } // Avoid double-processing
  });
  
  console.log(`Auto-carryover: Found ${incompleteTasks.length} incomplete tasks`);
  
  for (const task of incompleteTasks) {
    // Add overdue tag if not already present
    if (!task.tags.includes('overdue')) {
      task.tags.push('overdue');
    }
    
    // Add carryover history to tags
    const carryoverTag = `carried-over-${today.toISOString().split('T')[0]}`;
    if (!task.tags.includes(carryoverTag)) {
      task.tags.push(carryoverTag);
    }
    
    // Update task with carryover information
    task.updatedAt = today;
    await task.save();
    
    console.log(`Carried over task: ${task.title} (ID: ${task._id})`);
  }
}

async function sendOverdueReminders() {
  const overdueTasks = await Task.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'completed' }
  }).populate('assignedTo', 'name email');

  for (const task of overdueTasks) {
    const userIds = task.assignedTo.map((user: any) => user._id.toString());
    
    await notificationQueue.add('send-notification', {
      type: 'single',
      userIds,
      notification: {
        type: 'task_overdue',
        title: 'Task Overdue',
        body: `Task "${task.title}" is overdue`,
        meta: { taskId: task._id },
      },
    });
  }
}

async function cleanupOldSessions() {
  // This would clean up expired sessions from Redis
  // Implementation depends on your session storage strategy
  console.log('Cleaning up old sessions...');
}

async function scheduleWeeklyReports() {
  const admins = await User.find({ role: 'admin' });
  
  for (const admin of admins) {
    await reportQueue.add('generate-report', {
      type: 'weekly',
      userId: admin._id,
    });
  }
}

// Schedule recurring jobs
export const scheduleJobs = async () => {
  // Auto-carryover incomplete tasks daily at 00:05 Asia/Colombo
  await maintenanceQueue.add('maintenance', 
    { type: 'auto_carryover_tasks' },
    { 
      repeat: { 
        pattern: '5 0 * * *',
        tz: 'Asia/Colombo'
      } 
    }
  );
  
  // Send overdue reminders daily at 08:00 Asia/Colombo
  await maintenanceQueue.add('maintenance', 
    { type: 'send_overdue_reminders' },
    { 
      repeat: { 
        pattern: '0 8 * * *',
        tz: 'Asia/Colombo'
      } 
    }
  );
  
  // Cleanup old sessions daily at 2 AM Asia/Colombo
  await maintenanceQueue.add('maintenance',
    { type: 'cleanup_old_sessions' },
    { 
      repeat: { 
        pattern: '0 2 * * *',
        tz: 'Asia/Colombo'
      } 
    }
  );
  
  // Generate weekly reports every Monday at 08:10 Asia/Colombo
  await maintenanceQueue.add('maintenance',
    { type: 'generate_weekly_reports' },
    { 
      repeat: { 
        pattern: '10 8 * * 1',
        tz: 'Asia/Colombo'
      } 
    }
  );
};