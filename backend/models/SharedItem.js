const mongoose = require('mongoose');

const sharedItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['password', 'note', 'contact'],
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permissions: {
    view: {
      type: Boolean,
      default: true
    },
    edit: {
      type: Boolean,
      default: false
    },
    delete: {
      type: Boolean,
      default: false
    },
    share: {
      type: Boolean,
      default: false
    }
  },
  accessControl: {
    type: String,
    enum: ['team', 'role-based', 'individual'],
    default: 'team'
  },
  allowedRoles: [{
    type: String,
    enum: ['owner', 'admin', 'member', 'viewer']
  }],
  allowedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: {
      view: { type: Boolean, default: true },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      share: { type: Boolean, default: false }
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sharedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
sharedItemSchema.index({ itemType: 1, itemId: 1 });
sharedItemSchema.index({ team: 1 });
sharedItemSchema.index({ sharedBy: 1 });
sharedItemSchema.index({ isActive: 1 });

// Update the updatedAt field on save
sharedItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if user has specific permission
sharedItemSchema.methods.hasPermission = function(userId, permission, userRole = null) {
  if (!this.isActive) return false;
  
  // Check individual user permissions first
  const individualAccess = this.allowedUsers.find(au => au.user.toString() === userId.toString());
  if (individualAccess && individualAccess.permissions[permission]) {
    return true;
  }
  
  // Check role-based permissions
  if (this.accessControl === 'role-based' && userRole) {
    if (this.allowedRoles.includes(userRole)) {
      return this.permissions[permission];
    }
  }
  
  // Check team-wide permissions
  if (this.accessControl === 'team') {
    return this.permissions[permission];
  }
  
  return false;
};

// Method to add user-specific permissions
sharedItemSchema.methods.addUserPermission = function(userId, permissions) {
  const existingUser = this.allowedUsers.find(au => au.user.toString() === userId.toString());
  
  if (existingUser) {
    existingUser.permissions = { ...existingUser.permissions, ...permissions };
  } else {
    this.allowedUsers.push({
      user: userId,
      permissions: permissions
    });
  }
  
  return this.save();
};

// Method to remove user-specific permissions
sharedItemSchema.methods.removeUserPermission = function(userId) {
  this.allowedUsers = this.allowedUsers.filter(au => au.user.toString() !== userId.toString());
  return this.save();
};

// Method to update team permissions
sharedItemSchema.methods.updateTeamPermissions = function(permissions) {
  this.permissions = { ...this.permissions, ...permissions };
  return this.save();
};

// Static method to find items accessible by user
sharedItemSchema.statics.findAccessibleByUser = function(userId, teamId, userRole) {
  return this.find({
    team: teamId,
    isActive: true,
    $or: [
      { accessControl: 'team' },
      { 
        accessControl: 'role-based', 
        allowedRoles: userRole 
      },
      { 
        accessControl: 'individual', 
        'allowedUsers.user': userId 
      }
    ]
  }).populate('itemId').populate('sharedBy', 'username email');
};

module.exports = mongoose.model('SharedItem', sharedItemSchema); 