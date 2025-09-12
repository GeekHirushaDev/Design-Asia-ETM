import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import TimeLog from '../models/TimeLog.js';

const router = express.Router();

// Generate weekly report
router.post('/weekly/generate', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();

    // Gather data for the report
    const [tasks, users, attendance, timeLogs] = await Promise.all([
      Task.find({
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('createdBy assignedTo', 'name email'),
      User.find({ role: 'employee' }),
      Attendance.find({
        date: { $gte: startDate, $lte: endDate }
      }).populate('userId', 'name email'),
      TimeLog.find({
        from: { $gte: startDate, $lte: endDate }
      }).populate('userId taskId', 'name title')
    ]);

    // Calculate KPIs
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const overdueTasks = tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
    ).length;

    const totalWorkingHours = timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0) / 3600;
    const avgTaskTime = completedTasks > 0 ? totalWorkingHours / completedTasks : 0;

    const attendanceRate = attendance.length > 0 ? 
      (attendance.filter(a => a.clockIn && a.clockOut).length / attendance.length) * 100 : 0;

    const reportData = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      kpis: {
        totalTasks,
        completedTasks,
        completionRate: Math.round(completionRate * 100) / 100,
        overdueTasks,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        avgTaskTime: Math.round(avgTaskTime * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      },
      tasks: tasks.map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo.map((u: any) => u.name).join(', '),
        createdAt: task.createdAt,
        completedAt: task.status === 'completed' ? task.updatedAt : null
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
      attendance: {
        totalRecords: attendance.length,
        presentDays: attendance.filter(a => a.clockIn && a.clockOut).length,
        rate: attendanceRate
      }
    };

    // In a real implementation, you would generate a PDF here
    // For now, we'll return the data structure
    res.json({
      message: 'Weekly report generated successfully',
      reportId: `weekly-${Date.now()}`,
      data: reportData,
      downloadUrl: `/api/reports/weekly-${Date.now()}/download`
    });
  } catch (error) {
    console.error('Generate weekly report error:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Generate custom report
router.post('/custom/generate', [
  authenticateToken,
  requireRole('admin'),
  body('type').isIn(['task_performance', 'attendance', 'custom']),
  body('dateRange.start').isISO8601(),
  body('dateRange.end').isISO8601(),
], async (req: AuthRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, dateRange, filters } = req.body;
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    let reportData: any = {
      type,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      filters
    };

    switch (type) {
      case 'task_performance':
        const tasks = await Task.find({
          createdAt: { $gte: startDate, $lte: endDate },
          ...(filters.priority && { priority: filters.priority }),
          ...(filters.status && { status: filters.status }),
          ...(filters.userId && { assignedTo: filters.userId })
        }).populate('createdBy assignedTo', 'name email');

        reportData.tasks = tasks;
        reportData.summary = {
          total: tasks.length,
          completed: tasks.filter(t => t.status === 'completed').length,
          inProgress: tasks.filter(t => t.status === 'in_progress').length,
          overdue: tasks.filter(t => 
            t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
          ).length
        };
        break;

      case 'attendance':
        const attendance = await Attendance.find({
          date: { $gte: startDate, $lte: endDate },
          ...(filters.userId && { userId: filters.userId })
        }).populate('userId', 'name email');

        reportData.attendance = attendance;
        reportData.summary = {
          totalRecords: attendance.length,
          presentDays: attendance.filter(a => a.clockIn && a.clockOut).length,
          partialDays: attendance.filter(a => a.clockIn && !a.clockOut).length,
          absentDays: attendance.filter(a => !a.clockIn).length
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    res.json({
      message: 'Custom report generated successfully',
      reportId: `${type}-${Date.now()}`,
      data: reportData,
      downloadUrl: `/api/reports/${type}-${Date.now()}/download`
    });
  } catch (error) {
    console.error('Generate custom report error:', error);
    res.status(500).json({ error: 'Failed to generate custom report' });
  }
});

// Download report (placeholder)
router.get('/:reportId/download', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res) => {
  try {
    const { reportId } = req.params;
    
    // In a real implementation, you would:
    // 1. Fetch the report data from database
    // 2. Generate PDF using puppeteer or similar
    // 3. Return the PDF file
    
    res.json({
      message: 'Report download endpoint',
      reportId,
      note: 'PDF generation not implemented in this demo'
    });
  } catch (error) {
    console.error('Download report error:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

export default router;