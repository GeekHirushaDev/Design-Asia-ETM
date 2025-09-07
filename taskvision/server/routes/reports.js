const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user's project IDs
  const userProjects = await Project.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  }).select('_id');

  const projectIds = userProjects.map(p => p._id);

  // Task statistics
  const taskStats = await Task.aggregate([
    {
      $match: {
        assignee: userId,
        isArchived: false
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ['$dueDate', new Date()] },
                  { $nin: ['$status', ['completed', 'cancelled']] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Recent activity
  const recentTasks = await Task.find({
    project: { $in: projectIds },
    isArchived: false
  })
    .populate('assignee', 'name avatar')
    .populate('project', 'name code')
    .sort({ updatedAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      taskStatistics: taskStats[0] || { total: 0, completed: 0, inProgress: 0, overdue: 0 },
      recentActivity: recentTasks
    }
  });
}));

module.exports = router;
