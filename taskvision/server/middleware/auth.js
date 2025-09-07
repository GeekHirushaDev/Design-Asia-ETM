const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Server error during authentication.' 
    });
  }
};

// Middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is manager or admin
const managerMiddleware = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Access denied. Manager privileges required.' 
    });
  }
  next();
};

// Middleware to check project permissions
const projectPermissionMiddleware = (permission) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.body.project;
      
      if (!projectId) {
        return res.status(400).json({ 
          error: 'Project ID is required.' 
        });
      }

      const Project = require('../models/Project');
      const project = await Project.findById(projectId);
      
      if (!project) {
        return res.status(404).json({ 
          error: 'Project not found.' 
        });
      }

      // Check if user has permission
      if (!project.hasPermission(req.user._id, permission)) {
        return res.status(403).json({ 
          error: `Access denied. ${permission} permission required.` 
        });
      }

      req.project = project;
      next();
    } catch (error) {
      console.error('Project permission middleware error:', error);
      res.status(500).json({ 
        error: 'Server error during permission check.' 
      });
    }
  };
};

// Middleware to check team membership
const teamMembershipMiddleware = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.team;
    
    if (!teamId) {
      return res.status(400).json({ 
        error: 'Team ID is required.' 
      });
    }

    const Team = require('../models/Team');
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ 
        error: 'Team not found.' 
      });
    }

    // Check if user is a member
    if (!team.isMember(req.user._id)) {
      return res.status(403).json({ 
        error: 'Access denied. Team membership required.' 
      });
    }

    req.team = team;
    next();
  } catch (error) {
    console.error('Team membership middleware error:', error);
    res.status(500).json({ 
      error: 'Server error during team membership check.' 
    });
  }
};

// Middleware to check if user can edit task
const taskEditMiddleware = async (req, res, next) => {
  try {
    const taskId = req.params.id || req.params.taskId;
    
    if (!taskId) {
      return res.status(400).json({ 
        error: 'Task ID is required.' 
      });
    }

    const Task = require('../models/Task');
    const task = await Task.findById(taskId);
    
    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found.' 
      });
    }

    // Check if user can edit task
    if (!task.canEdit(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. You can only edit tasks assigned to you or created by you.' 
      });
    }

    req.task = task;
    next();
  } catch (error) {
    console.error('Task edit middleware error:', error);
    res.status(500).json({ 
      error: 'Server error during task permission check.' 
    });
  }
};

// Rate limiting middleware
const rateLimitMiddleware = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create request history for this client
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }
    
    const clientRequests = requests.get(clientId);
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(clientId, validRequests);
    
    next();
  };
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  managerMiddleware,
  projectPermissionMiddleware,
  teamMembershipMiddleware,
  taskEditMiddleware,
  rateLimitMiddleware
};
