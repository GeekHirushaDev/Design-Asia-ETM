const express = require('express');
const { body, query, validationResult } = require('express-validator');

const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { projectPermissionMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get user's projects
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const query = {
    $or: [
      { owner: req.user._id },
      { 'members.user': req.user._id }
    ],
    isArchived: false
  };

  if (status) query.status = status;

  const projects = await Project.find(query)
    .populate('owner', 'name email avatar')
    .populate('team', 'name department')
    .populate('members.user', 'name email avatar')
    .sort({ lastActivity: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({
    success: true,
    data: projects
  });
}));

// @route   POST /api/projects
// @desc    Create new project
// @access  Private
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('code').trim().isLength({ min: 1, max: 10 }),
  body('description').optional().trim().isLength({ max: 1000 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const project = await Project.create({
    ...req.body,
    owner: req.user._id
  });

  await project.populate('owner', 'name email avatar');

  res.status(201).json({
    success: true,
    data: project
  });
}));

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('owner', 'name email avatar department')
    .populate('team', 'name department members')
    .populate('members.user', 'name email avatar department');

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  res.json({
    success: true,
    data: project
  });
}));

module.exports = router;
