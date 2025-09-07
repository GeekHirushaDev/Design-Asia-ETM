const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  code: {
    type: String,
    required: [true, 'Team code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Team code cannot exceed 10 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team must have a lead']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['lead', 'senior', 'junior', 'intern', 'contractor'],
      default: 'junior'
    },
    specialization: {
      type: String,
      enum: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'qa', 'design', 'product', 'data', 'other'],
      default: 'other'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  skills: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    },
    category: {
      type: String,
      enum: ['programming', 'framework', 'tool', 'methodology', 'design', 'other'],
      default: 'other'
    }
  }],
  workingHours: {
    timezone: {
      type: String,
      default: 'UTC'
    },
    schedule: {
      monday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: true }
      },
      tuesday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: true }
      },
      wednesday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: true }
      },
      thursday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: true }
      },
      friday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: true }
      },
      saturday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: false }
      },
      sunday: {
        start: String,
        end: String,
        isWorkingDay: { type: Boolean, default: false }
      }
    }
  },
  location: {
    office: {
      type: String,
      trim: true
    },
    address: String,
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    },
    isRemote: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    isPublic: {
      type: Boolean,
      default: false
    },
    allowJoinRequests: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    maxMembers: {
      type: Number,
      min: 1,
      max: 100,
      default: 20
    }
  },
  statistics: {
    totalTasks: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    totalProjects: {
      type: Number,
      default: 0
    },
    activeProjects: {
      type: Number,
      default: 0
    },
    averageTaskCompletion: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
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
teamSchema.index({ lead: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ department: 1 });
teamSchema.index({ code: 1 }, { unique: true });
teamSchema.index({ 'location.coordinates': '2dsphere' });
teamSchema.index({ tags: 1 });
teamSchema.index({ createdAt: -1 });

// Virtual for active member count
teamSchema.virtual('activeMemberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for team capacity (considering working hours)
teamSchema.virtual('weeklyCapacity').get(function() {
  const workingDays = Object.values(this.workingHours.schedule || {})
    .filter(day => day.isWorkingDay).length;
  return this.activeMemberCount * workingDays * 8; // 8 hours per day
});

// Pre-save middleware
teamSchema.pre('save', function(next) {
  // Update last activity
  this.lastActivity = new Date();
  
  // Auto-generate team code if not provided
  if (!this.code && this.name) {
    this.code = this.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 10);
  }
  
  // Ensure lead is in members array
  if (this.lead) {
    const leadInMembers = this.members.find(member => 
      member.user.toString() === this.lead.toString()
    );
    
    if (!leadInMembers) {
      this.members.push({
        user: this.lead,
        role: 'lead',
        specialization: 'other',
        isActive: true
      });
    } else if (leadInMembers.role !== 'lead') {
      leadInMembers.role = 'lead';
    }
  }
  
  next();
});

// Method to add member
teamSchema.methods.addMember = function(userId, role = 'junior', specialization = 'other') {
  // Check if team is at capacity
  if (this.activeMemberCount >= this.settings.maxMembers) {
    throw new Error('Team is at maximum capacity');
  }
  
  // Check if user is already a member
  const memberExists = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (memberExists) {
    if (memberExists.isActive) {
      throw new Error('User is already an active member of this team');
    } else {
      // Reactivate the member
      memberExists.isActive = true;
      memberExists.role = role;
      memberExists.specialization = specialization;
      memberExists.joinedAt = new Date();
    }
  } else {
    this.members.push({
      user: userId,
      role,
      specialization,
      isActive: true
    });
  }
  
  return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(userId) {
  // Cannot remove team lead
  if (this.lead.toString() === userId.toString()) {
    throw new Error('Cannot remove team lead. Transfer leadership first.');
  }
  
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }
  
  return this.save();
};

// Method to transfer leadership
teamSchema.methods.transferLeadership = function(newLeadId) {
  const newLead = this.members.find(member => 
    member.user.toString() === newLeadId.toString() && member.isActive
  );
  
  if (!newLead) {
    throw new Error('New lead must be an active member of the team');
  }
  
  // Update old lead role
  const oldLead = this.members.find(member => 
    member.user.toString() === this.lead.toString()
  );
  if (oldLead) {
    oldLead.role = 'senior';
  }
  
  // Update new lead
  newLead.role = 'lead';
  this.lead = newLeadId;
  
  return this.save();
};

// Method to update member role
teamSchema.methods.updateMemberRole = function(userId, newRole, newSpecialization) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!member) {
    throw new Error('User is not a member of this team');
  }
  
  member.role = newRole;
  if (newSpecialization) {
    member.specialization = newSpecialization;
  }
  
  return this.save();
};

// Method to check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to get member role
teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
  return member ? member.role : null;
};

// Method to calculate workload
teamSchema.methods.calculateWorkload = async function() {
  const Task = mongoose.model('Task');
  
  const tasks = await Task.find({
    team: this._id,
    status: { $nin: ['completed', 'cancelled'] },
    isArchived: false
  });
  
  const totalEstimatedHours = tasks.reduce((sum, task) => 
    sum + (task.estimatedHours || 0), 0
  );
  
  return {
    totalTasks: tasks.length,
    totalEstimatedHours,
    averageTasksPerMember: this.activeMemberCount > 0 ? 
      Math.round(tasks.length / this.activeMemberCount) : 0,
    averageHoursPerMember: this.activeMemberCount > 0 ? 
      Math.round(totalEstimatedHours / this.activeMemberCount) : 0
  };
};

// Method to update statistics
teamSchema.methods.updateStatistics = async function() {
  const Task = mongoose.model('Task');
  const Project = mongoose.model('Project');
  
  const [tasks, projects] = await Promise.all([
    Task.find({ team: this._id }),
    Project.find({ team: this._id })
  ]);
  
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const activeProjects = projects.filter(project => 
    project.status === 'active' && !project.isArchived
  );
  
  this.statistics = {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    totalProjects: projects.length,
    activeProjects: activeProjects.length,
    averageTaskCompletion: tasks.length > 0 ? 
      Math.round((completedTasks.length / tasks.length) * 100) : 0
  };
  
  return this.save();
};

// Static method to find user's teams
teamSchema.statics.findUserTeams = function(userId) {
  return this.find({
    $or: [
      { lead: userId },
      { 'members.user': userId, 'members.isActive': true }
    ],
    isArchived: false
  }).sort({ lastActivity: -1 });
};

// Static method to find teams by department
teamSchema.statics.findByDepartment = function(department) {
  return this.find({
    department,
    isArchived: false,
    isActive: true
  }).sort({ name: 1 });
};

// Static method to get team statistics
teamSchema.statics.getStatistics = function(filters = {}) {
  return this.aggregate([
    { $match: { isArchived: false, isActive: true, ...filters } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalMembers: { $sum: '$activeMemberCount' },
        averageTeamSize: { $avg: '$activeMemberCount' },
        departments: { $addToSet: '$department' }
      }
    }
  ]);
};

module.exports = mongoose.model('Team', teamSchema);
