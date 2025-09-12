import express from 'express';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createCommentSchema } from '../validation/schemas.js';
import { PushService } from '../services/pushService.js';
import { AuthRequest } from '../types/index.js';

const router = express.Router();

// Get comments for a task
router.get('/task/:taskId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    // Check if user has access to the task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const comments = await Comment.find({ taskId })
      .populate('userId', 'name email avatarUrl')
      .populate('mentions', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Comment.countDocuments({ taskId });
    
    res.json({
      comments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Create comment
router.post('/task/:taskId', [
  authenticateToken,
  validate(createCommentSchema),
], async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const { content, mentions = [] } = req.body;
    
    // Check if user has access to the task
    const task = await Task.findById(taskId).populate('assignedTo', 'name email');
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    if (req.user?.role === 'employee') {
      const isAssigned = task.assignedTo.some((assignee: any) => 
        assignee._id.toString() === req.user?._id.toString()
      );
      
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const comment = new Comment({
      taskId,
      userId: req.user?._id,
      content,
      mentions,
    });
    
    await comment.save();
    await comment.populate('userId', 'name email avatarUrl');
    await comment.populate('mentions', 'name email');
    
    // Send notifications to mentioned users
    if (mentions.length > 0) {
      const mentionedUsers = await User.find({ _id: { $in: mentions } });
      
      for (const mentionedUser of mentionedUsers) {
        await PushService.sendNotification(mentionedUser._id.toString(), {
          type: 'comment_mention',
          title: 'You were mentioned',
          body: `${req.user?.name} mentioned you in a comment on "${task.title}"`,
          meta: {
            taskId: task._id,
            commentId: comment._id,
          },
        });
      }
    }
    
    // Notify task assignees (except the commenter)
    const assigneeIds = task.assignedTo
      .filter((assignee: any) => assignee._id.toString() !== req.user?._id.toString())
      .map((assignee: any) => assignee._id.toString());
    
    if (assigneeIds.length > 0) {
      await PushService.sendBulkNotification(assigneeIds, {
        type: 'task_comment',
        title: 'New comment',
        body: `${req.user?.name} commented on "${task.title}"`,
        meta: {
          taskId: task._id,
          commentId: comment._id,
        },
      });
    }
    
    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update comment
router.put('/:commentId', [
  authenticateToken,
  validate(createCommentSchema),
], async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Only the author can edit their comment
    if (comment.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    
    await comment.populate('userId', 'name email avatarUrl');
    await comment.populate('mentions', 'name email');
    
    res.json({ comment });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete comment
router.delete('/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Only the author or admin can delete the comment
    if (comment.userId.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Comment.findByIdAndDelete(commentId);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;