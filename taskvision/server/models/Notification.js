const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification must have a recipient']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'task_assigned',
      'task_updated',
      'task_completed',
      'task_overdue',
      'task_due_soon',
      'task_commented',
      'project_created',
      'project_updated',
      'project_invitation',
      'team_invitation',
      'team_updated',
      'mention',
      'reminder',
      'system',
      'report_generated',
      'deadline_approaching',
      'milestone_completed'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  data: {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId
    },
    url: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['task', 'project', 'team', 'system', 'social', 'reminder'],
    default: 'task'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  isEmailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  isPushSent: {
    type: Boolean,
    default: false
  },
  pushSentAt: Date,
  scheduledFor: Date,
  expiresAt: Date,
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index for expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for age in days
notificationSchema.virtual('ageInDays').get(function() {
  const diffTime = new Date() - this.createdAt;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set default expiry for notifications (30 days from creation)
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Method to archive notification
notificationSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

// Static method to create task notification
notificationSchema.statics.createTaskNotification = function(type, recipientId, senderId, taskId, title, message, metadata = {}) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    category: 'task',
    data: {
      task: taskId,
      url: `/tasks/${taskId}`,
      metadata
    },
    priority: type.includes('overdue') || type.includes('urgent') ? 'high' : 'medium'
  });
};

// Static method to create project notification
notificationSchema.statics.createProjectNotification = function(type, recipientId, senderId, projectId, title, message, metadata = {}) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    category: 'project',
    data: {
      project: projectId,
      url: `/projects/${projectId}`,
      metadata
    },
    priority: type.includes('deadline') ? 'high' : 'medium'
  });
};

// Static method to create team notification
notificationSchema.statics.createTeamNotification = function(type, recipientId, senderId, teamId, title, message, metadata = {}) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    category: 'team',
    data: {
      team: teamId,
      url: `/teams/${teamId}`,
      metadata
    }
  });
};

// Static method to create bulk notifications
notificationSchema.statics.createBulkNotifications = function(notifications) {
  return this.insertMany(notifications);
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false
  });
};

// Static method to get notifications for user
notificationSchema.statics.getForUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    priority,
    isRead,
    includeArchived = false
  } = options;

  const query = {
    recipient: userId
  };

  if (!includeArchived) {
    query.isArchived = false;
  }

  if (type) query.type = type;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (typeof isRead === 'boolean') query.isRead = isRead;

  return this.find(query)
    .populate('sender', 'name avatar')
    .populate('data.task', 'title status priority')
    .populate('data.project', 'name code status')
    .populate('data.team', 'name department')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to archive old notifications
notificationSchema.statics.archiveOldNotifications = function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    { 
      createdAt: { $lt: cutoffDate },
      isArchived: false 
    },
    { 
      isArchived: true,
      archivedAt: new Date()
    }
  );
};

// Static method to delete expired notifications
notificationSchema.statics.deleteExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Static method to get notification statistics
notificationSchema.statics.getStatistics = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        recipient: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        unread: 1,
        readPercentage: {
          $multiply: [
            { $divide: [{ $subtract: ['$total', '$unread'] }, '$total'] },
            100
          ]
        },
        typeBreakdown: {
          $reduce: {
            input: '$byType',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                { '$$this.type': { $add: [{ $ifNull: ['$$value.$$this.type', 0] }, 1] } }
              ]
            }
          }
        },
        priorityBreakdown: {
          $reduce: {
            input: '$byPriority',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                { '$$this.priority': { $add: [{ $ifNull: ['$$value.$$this.priority', 0] }, 1] } }
              ]
            }
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Notification', notificationSchema);
