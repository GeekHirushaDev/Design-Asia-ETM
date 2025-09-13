import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import TimeLog from '../models/TimeLog.js';
import { WeeklyReportService } from '../services/weeklyReportService.js';

const router = express.Router();

// Generate weekly report
router.post('/weekly/generate', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response) => {
  try {
    const { weekOffset = 0, userId } = req.body;
    
    const reportData = await WeeklyReportService.generateWeeklyTaskReport(weekOffset, userId);

    return res.json({
      message: 'Weekly report generated successfully',
      reportId: `weekly-${Date.now()}`,
      data: reportData,
      downloadUrl: `/api/reports/weekly-${Date.now()}/download`
    });
  } catch (error) {
    console.error('Generate weekly report error:', error);
    return res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Generate weekly comparison report
router.get('/weekly/comparison', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.query;
    
    const comparisonData = await WeeklyReportService.generateWeeklyComparison(userId as string);

    return res.json({
      message: 'Weekly comparison report generated successfully',
      data: comparisonData
    });
  } catch (error) {
    console.error('Generate weekly comparison error:', error);
    return res.status(500).json({ error: 'Failed to generate weekly comparison' });
  }
});

// Generate custom report
router.post('/custom/generate', [
  authenticateToken,
  requireRole('admin'),
  body('type').isIn(['task_performance', 'attendance', 'custom']),
  body('dateRange.start').isISO8601(),
  body('dateRange.end').isISO8601(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, dateRange, filters } = req.body as {
      type: string;
      dateRange: { start: string; end: string };
      filters: any;
    };
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

    return res.json({
      message: 'Custom report generated successfully',
      reportId: `${type}-${Date.now()}`,
      data: reportData,
      downloadUrl: `/api/reports/${type}-${Date.now()}/download`
    });
  } catch (error) {
    console.error('Generate custom report error:', error);
    return res.status(500).json({ error: 'Failed to generate custom report' });
  }
});

// Download report (placeholder)
router.get('/:reportId/download', [
  authenticateToken,
  requireRole('admin'),
], async (req: AuthRequest, res: Response) => {
  try {
    const { reportId } = req.params as { reportId: string };
    
    // In a real implementation, you would:
    // 1. Fetch the report data from database
    // 2. Generate PDF using puppeteer or similar
    // 3. Return the PDF file
    
    return res.json({
      message: 'Report download endpoint',
      reportId,
      note: 'PDF generation not implemented in this demo'
    });
  } catch (error) {
    console.error('Download report error:', error);
    return res.status(500).json({ error: 'Failed to download report' });
  }
});

export default router;