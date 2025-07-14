const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['login', 'logout', 'password_action', 'contact_action', 'note_action', 'backup', 'sync', 'security_event'],
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'read', 'update', 'delete', 'export', 'import', 'share', 'login', 'logout', 'failed_login'],
    required: true
  },
  entity: {
    type: String,
    enum: ['password', 'contact', 'note', 'user', 'backup', 'system'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  sessionId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String
  },
  duration: {
    type: Number // in milliseconds
  }
}, {
  timestamps: true
});

// Indexes for better query performance
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ entity: 1, timestamp: -1 });
analyticsSchema.index({ success: 1, timestamp: -1 });

// Static method to get user activity summary
analyticsSchema.statics.getUserActivitySummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), timestamp: { $gte: startDate } } },
    { $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        type: "$type"
      },
      count: { $sum: 1 }
    }},
    { $group: {
      _id: "$_id.date",
      activities: {
        $push: {
          type: "$_id.type",
          count: "$count"
        }
      },
      totalActivities: { $sum: "$count" }
    }},
    { $sort: { _id: -1 } }
  ]);
};

// Static method to get security events
analyticsSchema.statics.getSecurityEvents = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    userId,
    type: 'security_event',
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

// Static method to get failed login attempts
analyticsSchema.statics.getFailedLogins = function(userId, hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);
  
  return this.find({
    userId,
    type: 'login',
    action: 'failed_login',
    timestamp: { $gte: startDate }
  }).sort({ timestamp: -1 });
};

// Static method to get system metrics
analyticsSchema.statics.getSystemMetrics = function(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { timestamp: { $gte: startDate } } },
    { $group: {
      _id: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        entity: "$entity",
        action: "$action"
      },
      count: { $sum: 1 },
      avgDuration: { $avg: "$duration" }
    }},
    { $group: {
      _id: "$_id.date",
      entities: {
        $push: {
          entity: "$_id.entity",
          action: "$_id.action",
          count: "$count",
          avgDuration: "$avgDuration"
        }
      }
    }},
    { $sort: { _id: -1 } }
  ]);
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics; 