const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['family', 'team', 'organization'],
    default: 'team'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    invitedAt: {
      type: Date,
      default: Date.now
    },
    joinedAt: {
      type: Date
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  settings: {
    allowPasswordSharing: {
      type: Boolean,
      default: true
    },
    allowNoteSharing: {
      type: Boolean,
      default: true
    },
    allowContactSharing: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 50
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
teamSchema.index({ owner: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ type: 1 });
teamSchema.index({ isActive: 1 });

// Update the updatedAt field on save
teamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.status === 'accepted').length;
});

// Method to check if user has specific role
teamSchema.methods.hasRole = function(userId, role) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member || member.status !== 'accepted') return false;
  
  const roleHierarchy = {
    'owner': 4,
    'admin': 3,
    'member': 2,
    'viewer': 1
  };
  
  return roleHierarchy[member.role] >= roleHierarchy[role];
};

// Method to get user's role
teamSchema.methods.getUserRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add member
teamSchema.methods.addMember = function(userId, role = 'member', invitedBy) {
  const existingMember = this.members.find(m => m.user.toString() === userId.toString());
  
  if (existingMember) {
    existingMember.role = role;
    existingMember.invitedBy = invitedBy;
    existingMember.invitedAt = Date.now();
    existingMember.status = 'pending';
  } else {
    this.members.push({
      user: userId,
      role: role,
      invitedBy: invitedBy,
      invitedAt: Date.now(),
      status: 'pending'
    });
  }
  
  return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

// Method to update member role
teamSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = newRole;
    return this.save();
  }
  return Promise.reject(new Error('Member not found'));
};

module.exports = mongoose.model('Team', teamSchema); 