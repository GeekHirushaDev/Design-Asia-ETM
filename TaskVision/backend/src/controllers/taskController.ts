import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { getDistance } from 'geolib';

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const filter: any = {};

    // Role-based filtering
    if (req.user?.role === 'employee') {
      filter.assignedTo = req.user._id;
    }

    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Assigned to filter (admin only)
    if (assignedTo && req.user?.role === 'admin') {
      filter.assignedTo = assignedTo;
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'firstName lastName email profileImage')
      .populate('createdBy', 'firstName lastName email')
      .sort({ [sortBy as string]: sortOrder === 'desc' ? -1 : 1 })
      .limit(Number(limit) * 1)
      .skip((Number(page) - 1) * Number(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email profileImage location')
      .populate('createdBy', 'firstName lastName email')
      .populate('comments.user', 'firstName lastName profileImage')
      .populate('proofSubmissions.approvedBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access permissions
    if (
      req.user?.role === 'employee' &&
      task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (Admin only)
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      priority,
      assignedTo,
      dueDate,
      estimatedHours,
      location,
      tags,
      approvalRequired,
    } = req.body;

    // Check if assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Assigned user not found',
      });
    }

    const task = await Task.create({
      title,
      description,
      priority,
      assignedTo,
      createdBy: req.user?._id,
      dueDate,
      estimatedHours,
      location,
      tags,
      approvalRequired,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: populatedTask },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check permissions
    const isAdmin = req.user?.role === 'admin';
    const isAssigned = task.assignedTo.toString() === req.user?._id.toString();

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Employees can only update status and add comments
    if (req.user?.role === 'employee') {
      const allowedFields = ['status', 'comments'];
      const updateFields = Object.keys(req.body);
      const isValidUpdate = updateFields.every(field => allowedFields.includes(field));

      if (!isValidUpdate) {
        return res.status(403).json({
          success: false,
          message: 'Employees can only update status and add comments',
        });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin only)
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Start task timer
// @route   POST /api/tasks/:id/start
// @access  Private (Employee only)
export const startTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is assigned to task
    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Check location if required
    const { lat, lng } = req.body;
    if (lat && lng && task.location) {
      const distance = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: task.location.lat, longitude: task.location.lng }
      );

      if (distance > task.location.radius) {
        return res.status(400).json({
          success: false,
          message: `You must be within ${task.location.radius}m of the task location to start`,
          distance,
          requiredRadius: task.location.radius,
        });
      }
    }

    // Start timer
    task.timeTracking.startTime = new Date();
    task.timeTracking.isPaused = false;
    task.status = 'In Progress';

    // Add new session
    task.timeTracking.sessions.push({
      startTime: new Date(),
      duration: 0,
    });

    await task.save();

    res.json({
      success: true,
      message: 'Task started successfully',
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Pause task timer
// @route   POST /api/tasks/:id/pause
// @access  Private (Employee only)
export const pauseTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    if (!task.timeTracking.startTime || task.timeTracking.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'Task is not currently running',
      });
    }

    // Pause timer
    task.timeTracking.isPaused = true;
    task.timeTracking.pausedAt = new Date();
    task.status = 'Paused';

    await task.save();

    res.json({
      success: true,
      message: 'Task paused successfully',
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Resume task timer
// @route   POST /api/tasks/:id/resume
// @access  Private (Employee only)
export const resumeTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    if (!task.timeTracking.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'Task is not paused',
      });
    }

    // Calculate paused duration
    if (task.timeTracking.pausedAt) {
      const pausedDuration = new Date().getTime() - task.timeTracking.pausedAt.getTime();
      task.timeTracking.totalPausedTime += pausedDuration;
    }

    // Resume timer
    task.timeTracking.isPaused = false;
    task.timeTracking.pausedAt = undefined;
    task.status = 'In Progress';

    await task.save();

    res.json({
      success: true,
      message: 'Task resumed successfully',
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Stop task timer
// @route   POST /api/tasks/:id/stop
// @access  Private (Employee only)
export const stopTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    if (!task.timeTracking.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Task timer has not been started',
      });
    }

    // Stop timer
    task.timeTracking.endTime = new Date();

    // Update current session
    const currentSession = task.timeTracking.sessions[task.timeTracking.sessions.length - 1];
    if (currentSession && !currentSession.endTime) {
      currentSession.endTime = new Date();
      currentSession.duration = currentSession.endTime.getTime() - currentSession.startTime.getTime();
    }

    // Calculate total duration
    const totalMs = task.timeTracking.endTime.getTime() - task.timeTracking.startTime.getTime();
    task.actualHours = Math.max(0, (totalMs - task.timeTracking.totalPausedTime) / (1000 * 60 * 60));

    await task.save();

    res.json({
      success: true,
      message: 'Task stopped successfully',
      data: { 
        task,
        duration: task.actualHours,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Complete task
// @route   POST /api/tasks/:id/complete
// @access  Private (Employee only)
export const completeTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Stop timer if running
    if (task.timeTracking.startTime && !task.timeTracking.endTime) {
      task.timeTracking.endTime = new Date();
      
      const currentSession = task.timeTracking.sessions[task.timeTracking.sessions.length - 1];
      if (currentSession && !currentSession.endTime) {
        currentSession.endTime = new Date();
        currentSession.duration = currentSession.endTime.getTime() - currentSession.startTime.getTime();
      }
    }

    // Update status
    task.status = 'Completed';
    task.completedAt = new Date();

    // If approval is required, set isApproved to false
    if (task.approvalRequired) {
      task.isApproved = false;
    } else {
      task.isApproved = true;
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task completed successfully',
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Submit task proof
// @route   POST /api/tasks/:id/proof
// @access  Private (Employee only)
export const submitProof = async (req: AuthRequest, res: Response) => {
  try {
    const { type, content, url } = req.body;
    
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this task',
      });
    }

    // Add proof submission
    task.proofSubmissions.push({
      type,
      content,
      url,
      submittedAt: new Date(),
      approved: false,
    });

    await task.save();

    res.json({
      success: true,
      message: 'Proof submitted successfully',
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Approve/Reject task proof
// @route   PUT /api/tasks/:id/proof/:proofId
// @access  Private (Admin only)
export const reviewProof = async (req: AuthRequest, res: Response) => {
  try {
    const { approved, rejectionReason } = req.body;
    
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const proof = task.proofSubmissions.id(req.params.proofId);
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Proof submission not found',
      });
    }

    // Update proof status
    proof.approved = approved;
    proof.approvedBy = req.user?._id;
    proof.approvedAt = new Date();
    
    if (!approved && rejectionReason) {
      proof.rejectionReason = rejectionReason;
    }

    await task.save();

    res.json({
      success: true,
      message: `Proof ${approved ? 'approved' : 'rejected'} successfully`,
      data: { task },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;
    
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check access permissions
    const isAdmin = req.user?.role === 'admin';
    const isAssigned = task.assignedTo.toString() === req.user?._id.toString();

    if (!isAdmin && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Add comment
    task.comments.push({
      user: req.user?._id,
      comment,
      createdAt: new Date(),
    });

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('comments.user', 'firstName lastName profileImage');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: { task: updatedTask },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
