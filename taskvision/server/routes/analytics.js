const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Get analytics overview
// @access  Private
router.get('/overview', asyncHandler(async (req, res) => {
  const { startDate, endDate, projectId } = req.query;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const matchFilter = { isArchived: false };
  if (Object.keys(dateFilter).length > 0) {
    matchFilter.createdAt = dateFilter;
  }
  if (projectId) matchFilter.project = projectId;

  const analytics = await Task.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        avgProgress: { $avg: '$progress' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);

  res.json({
    success: true,
    data: analytics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      avgProgress: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0
    }
  });
}));

module.exports = router;
