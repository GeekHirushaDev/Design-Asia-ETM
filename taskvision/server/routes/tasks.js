const express = require('express');
const { body, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { taskEditMiddleware, projectPermissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createTaskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('assignee')
    .isMongoId()
    .withMessage('Valid assignee ID is required'),
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('category')
    .optional()
    .isIn(['development', 'design', 'testing', 'documentation', 'meeting', 'research', 'other'])
    .withMessage('Invalid category'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000')
];

const updateTaskValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
];

// @route   GET /api/tasks
// @desc    Get tasks with filtering and pagination
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['todo', 'in-progress', 'review', 'completed', 'cancelled']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('assignee').optional().isMongoId().withMessage('Invalid assignee ID'),
  query('project').optional().isMongoId().withMessage('Invalid project ID'),
  query('overdue').optional().isBoolean().withMessage('Overdue must be boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    page = 1,
    limit = 20,
    status,
    priority,
    assignee,
    project,
    category,
    overdue,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    startDate,
    endDate
  } = req.query;

  // Build query
  const query = { isArchived: false };

  // Filter by user's access
  const userProjects = await Project.find({
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id }
    ]
  }).select('_id');

  const projectIds = userProjects.map(p => p._id);
  query.project = { $in: projectIds };

  // Apply filters
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignee = assignee;
  if (project) query.project = project;
  if (category) query.category = category;

  // Date range filter
  if (startDate || endDate) {
    query.dueDate = {};
    if (startDate) query.dueDate.$gte = new Date(startDate);
    if (endDate) query.dueDate.$lte = new Date(endDate);
  }

  // Overdue filter
  if (overdue === 'true') {
    query.dueDate = { $lt: new Date() };
    query.status = { $nin: ['completed', 'cancelled'] };
  }

  // Search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Execute query with pagination
  const skip = (page - 1) * limit;
  
  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('project', 'name code status')
      .populate('team', 'name department')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit)),
    Task.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      tasks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
}));

// @route   GET /api/tasks/my
// @desc    Get current user's tasks
// @access  Private
router.get('/my', asyncHandler(async (req, res) => {
  const {
    status,
    priority,
    limit = 20,
    sortBy = 'dueDate',
    sortOrder = 'asc'
  } = req.query;

  const query = {
    assignee: req.user._id,
    isArchived: false
  };

  if (status) query.status = status;
  if (priority) query.priority = priority;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const tasks = await Task.find(query)
    .populate('project', 'name code status')
    .populate('reporter', 'name email avatar')
    .sort(sortOptions)
    .limit(parseInt(limit));

  // Get task statistics
  const stats = await Task.aggregate([
    { $match: { assignee: req.user._id, isArchived: false } },
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

  res.json({
    success: true,
    data: {
      tasks,
      statistics: stats[0] || {
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0
      }
    }
  });
}));

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignee', 'name email avatar department')
    .populate('reporter', 'name email avatar department')
    .populate('project', 'name code status members')
    .populate('team', 'name department')
    .populate('comments.author', 'name avatar')
    .populate('watchers', 'name email avatar')
    .populate('dependencies.task', 'title status priority dueDate')
    .populate('timeTracking.user', 'name avatar');

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has access to this task
  const project = await Project.findById(task.project);
  const hasAccess = project.owner.toString() === req.user._id.toString() ||
                   project.members.some(member => member.user.toString() === req.user._id.toString());

  if (!hasAccess) {
    throw new AppError('Access denied', 403);
  }

  res.json({
    success: true,
    data: task
  });
}));

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private
router.post('/', createTaskValidation, projectPermissionMiddleware('canCreateTasks'), asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    title,
    description,
    assignee,
    project,
    team,
    dueDate,
    priority = 'medium',
    category = 'other',
    estimatedHours,
    tags,
    location,
    recurring,
    customFields
  } = req.body;

  // Validate assignee is member of project
  const projectDoc = await Project.findById(project);
  const isAssigneeMember = projectDoc.members.some(
    member => member.user.toString() === assignee.toString()
  );

  if (!isAssigneeMember && projectDoc.owner.toString() !== assignee.toString()) {
    throw new AppError('Assignee must be a member of the project', 400);
  }

  const task = await Task.create({
    title,
    description,
    assignee,
    reporter: req.user._id,
    project,
    team,
    dueDate,
    priority,
    category,
    estimatedHours,
    tags,
    location,
    recurring,
    customFields
  });

  await task.populate([
    { path: 'assignee', select: 'name email avatar' },
    { path: 'reporter', select: 'name email avatar' },
    { path: 'project', select: 'name code' }
  ]);

  // Create notification for assignee
  if (assignee.toString() !== req.user._id.toString()) {
    await Notification.createTaskNotification(
      'task_assigned',
      assignee,
      req.user._id,
      task._id,
      'New Task Assigned',
      `You have been assigned a new task: ${title}`,
      { priority, dueDate }
    );
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${project}`).emit('taskCreated', {
    task,
    project,
    reporter: req.user
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: task
  });
}));

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', updateTaskValidation, taskEditMiddleware, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    title,
    description,
    status,
    priority,
    dueDate,
    progress,
    tags,
    location,
    estimatedHours,
    customFields
  } = req.body;

  const task = req.task;
  const oldStatus = task.status;

  // Update fields
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (progress !== undefined) task.progress = progress;
  if (tags !== undefined) task.tags = tags;
  if (location !== undefined) task.location = location;
  if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
  if (customFields !== undefined) task.customFields = customFields;

  await task.save();

  await task.populate([
    { path: 'assignee', select: 'name email avatar' },
    { path: 'reporter', select: 'name email avatar' },
    { path: 'project', select: 'name code' }
  ]);

  // Create notifications for status changes
  if (status && status !== oldStatus) {
    const notifications = [];

    if (status === 'completed') {
      // Notify reporter if different from current user
      if (task.reporter.toString() !== req.user._id.toString()) {
        notifications.push({
          recipient: task.reporter,
          sender: req.user._id,
          type: 'task_completed',
          title: 'Task Completed',
          message: `Task "${task.title}" has been completed`,
          category: 'task',
          data: {
            task: task._id,
            project: task.project,
            url: `/tasks/${task._id}`
          }
        });
      }
    }

    if (notifications.length > 0) {
      await Notification.createBulkNotifications(notifications);
    }
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${task.project}`).emit('taskUpdated', {
    task,
    updatedBy: req.user,
    changes: { oldStatus, newStatus: status }
  });

  res.json({
    success: true,
    message: 'Task updated successfully',
    data: task
  });
}));

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', taskEditMiddleware, asyncHandler(async (req, res) => {
  const task = req.task;

  // Check if user has permission to delete (only admin, project owner, or task creator)
  const project = await Project.findById(task.project);
  const canDelete = req.user.role === 'admin' ||
                   project.owner.toString() === req.user._id.toString() ||
                   task.reporter.toString() === req.user._id.toString();

  if (!canDelete) {
    throw new AppError('Access denied. Insufficient permissions to delete task.', 403);
  }

  // Soft delete - archive the task
  task.isArchived = true;
  task.archivedAt = new Date();
  task.archivedBy = req.user._id;
  await task.save();

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${task.project}`).emit('taskDeleted', {
    taskId: task._id,
    project: task.project,
    deletedBy: req.user
  });

  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

// @route   POST /api/tasks/:id/comments
// @desc    Add comment to task
// @access  Private
router.post('/:id/comments', [
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { content } = req.body;
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Add comment
  await task.addComment(content, req.user._id);

  await task.populate('comments.author', 'name avatar');

  // Get the newly added comment
  const newComment = task.comments[task.comments.length - 1];

  // Create notification for task assignee and watchers
  const recipients = [task.assignee, ...task.watchers].filter(
    id => id.toString() !== req.user._id.toString()
  );

  const notifications = recipients.map(recipientId => ({
    recipient: recipientId,
    sender: req.user._id,
    type: 'task_commented',
    title: 'New Comment',
    message: `${req.user.name} commented on task "${task.title}"`,
    category: 'task',
    data: {
      task: task._id,
      project: task.project,
      comment: newComment._id,
      url: `/tasks/${task._id}`
    }
  }));

  if (notifications.length > 0) {
    await Notification.createBulkNotifications(notifications);
  }

  // Emit real-time update
  const io = req.app.get('io');
  io.to(`project_${task.project}`).emit('commentAdded', {
    taskId: task._id,
    comment: newComment,
    author: req.user
  });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: newComment
  });
}));

// @route   POST /api/tasks/:id/time
// @desc    Add time tracking entry
// @access  Private
router.post('/:id/time', [
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('description').optional().trim().isLength({ max: 500 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { startTime, endTime, description } = req.body;
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Validate time range
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    throw new AppError('End time must be after start time', 400);
  }

  // Add time entry
  await task.addTimeEntry(req.user._id, start, end, description);

  res.json({
    success: true,
    message: 'Time entry added successfully',
    data: {
      actualHours: task.actualHours,
      newEntry: task.timeTracking[task.timeTracking.length - 1]
    }
  });
}));

// @route   GET /api/tasks/statistics
// @desc    Get task statistics
// @access  Private
router.get('/statistics', asyncHandler(async (req, res) => {
  const { project, team, startDate, endDate } = req.query;

  const filters = { isArchived: false };

  // Apply date filter
  if (startDate || endDate) {
    filters.createdAt = {};
    if (startDate) filters.createdAt.$gte = new Date(startDate);
    if (endDate) filters.createdAt.$lte = new Date(endDate);
  }

  // Apply project/team filters
  if (project) filters.project = project;
  if (team) filters.team = team;

  const stats = await Task.getStatistics(filters);

  res.json({
    success: true,
    data: stats[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      avgProgress: 0
    }
  });
}));

module.exports = router;
