const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  code: {
    type: String,
    required: [true, 'Project code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Project code cannot exceed 10 characters']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['web-development', 'mobile-app', 'desktop-app', 'api', 'design', 'research', 'marketing', 'other'],
    default: 'other'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Project must have an owner']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'developer', 'designer', 'tester', 'viewer'],
      default: 'developer'
    },
    permissions: {
      canCreateTasks: {
        type: Boolean,
        default: true
      },
      canEditTasks: {
        type: Boolean,
        default: true
      },
      canDeleteTasks: {
        type: Boolean,
        default: false
      },
      canManageMembers: {
        type: Boolean,
        default: false
      },
      canEditProject: {
        type: Boolean,
        default: false
      }
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  deadline: {
    type: Date
  },
  budget: {
    estimated: {
      type: Number,
      min: 0
    },
    actual: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean', 'select']
    }
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowInvites: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    timeTracking: {
      enabled: {
        type: Boolean,
        default: true
      },
      requireDescription: {
        type: Boolean,
        default: false
      }
    },
    notifications: {
      taskCreated: {
        type: Boolean,
        default: true
      },
      taskUpdated: {
        type: Boolean,
        default: true
      },
      taskCompleted: {
        type: Boolean,
        default: true
      },
      taskOverdue: {
        type: Boolean,
        default: true
      }
    }
  },
  repository: {
    type: {
      type: String,
      enum: ['github', 'gitlab', 'bitbucket', 'other']
    },
    url: String,
    branch: {
      type: String,
      default: 'main'
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  milestones: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue'],
      default: 'pending'
    },
    completedDate: Date,
    tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  templates: [{
    name: String,
    description: String,
    tasks: [{
      title: String,
      description: String,
      estimatedHours: Number,
      priority: String,
      category: String
    }]
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ team: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ code: 1 }, { unique: true });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ lastActivity: -1 });

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Virtual for completed task count
projectSchema.virtual('completedTaskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  match: { status: 'completed' },
  count: true
});

// Virtual for overdue status
projectSchema.virtual('isOverdue').get(function() {
  return this.deadline && this.status !== 'completed' && this.deadline < new Date();
});

// Virtual for days until deadline
projectSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline) return null;
  const diffTime = this.deadline - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
projectSchema.pre('save', function(next) {
  // Update last activity
  this.lastActivity = new Date();
  
  // Auto-generate project code if not provided
  if (!this.code && this.name) {
    this.code = this.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 10);
  }
  
  next();
});

// Method to add member
projectSchema.methods.addMember = function(userId, role = 'developer', permissions = {}) {
  const defaultPermissions = {
    canCreateTasks: true,
    canEditTasks: true,
    canDeleteTasks: false,
    canManageMembers: false,
    canEditProject: false
  };

  // Set permissions based on role
  switch (role) {
    case 'owner':
    case 'manager':
      Object.keys(defaultPermissions).forEach(key => {
        defaultPermissions[key] = true;
      });
      break;
    case 'viewer':
      Object.keys(defaultPermissions).forEach(key => {
        defaultPermissions[key] = false;
      });
      break;
  }

  const memberExists = this.members.find(member => 
    member.user.toString() === userId.toString()
  );

  if (memberExists) {
    throw new Error('User is already a member of this project');
  }

  this.members.push({
    user: userId,
    role,
    permissions: { ...defaultPermissions, ...permissions }
  });

  return this.save();
};

// Method to remove member
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

// Method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole, newPermissions = {}) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );

  if (!member) {
    throw new Error('User is not a member of this project');
  }

  member.role = newRole;
  if (Object.keys(newPermissions).length > 0) {
    member.permissions = { ...member.permissions, ...newPermissions };
  }

  return this.save();
};

// Method to check if user has permission
projectSchema.methods.hasPermission = function(userId, permission) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );

  if (!member) return false;
  
  // Owner has all permissions
  if (member.role === 'owner') return true;
  
  return member.permissions[permission] || false;
};

// Method to get member role
projectSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

// Method to calculate progress
projectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  
  const tasks = await Task.find({ 
    project: this._id, 
    isArchived: false 
  });
  
  if (tasks.length === 0) {
    this.progress = 0;
    return this.save();
  }
  
  const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
  this.progress = Math.round(totalProgress / tasks.length);
  
  return this.save();
};

// Static method to find user's projects
projectSchema.statics.findUserProjects = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ],
    isArchived: false
  }).sort({ lastActivity: -1 });
};

// Static method to get project statistics
projectSchema.statics.getStatistics = function(filters = {}) {
  return this.aggregate([
    { $match: { isArchived: false, ...filters } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        overdue: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $lt: ['$deadline', new Date()] },
                  { $ne: ['$status', 'completed'] }
                ]
              }, 
              1, 
              0
            ] 
          } 
        },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);
};

module.exports = mongoose.model('Project', projectSchema);
