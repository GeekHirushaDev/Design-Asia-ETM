import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const filter: any = { userId: req.user?._id };
    if (unreadOnly === 'true') {
      filter.read = false;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      userId: req.user?._id,
      read: false,
    });
    
    res.json({
      notifications,
      unreadCount,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user?._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user?._id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user?._id,
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;