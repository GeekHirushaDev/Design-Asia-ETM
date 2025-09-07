const express = require('express');
const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, isRead } = req.query;

  const notifications = await Notification.getForUser(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    type,
    isRead: isRead === 'true'
  });

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount
    }
  });
}));

// @route   PUT /api/notifications/mark-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-read', asyncHandler(async (req, res) => {
  await Notification.markAllAsRead(req.user._id);

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

module.exports = router;
