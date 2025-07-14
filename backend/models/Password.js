const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const passwordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  url: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  notes: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['social', 'work', 'finance', 'shopping', 'entertainment', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  strength: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  autoFill: {
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
}, {
  timestamps: true
});

// Index for better query performance
passwordSchema.index({ userId: 1, title: 1 });
passwordSchema.index({ userId: 1, category: 1 });
passwordSchema.index({ userId: 1, tags: 1 });

// Pre-save middleware to update timestamps
passwordSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate password strength
passwordSchema.methods.calculateStrength = function() {
  const password = this.password;
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  
  // Bonus for mixed case and numbers
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password) && /[^0-9]/.test(password)) score += 10;
  
  this.strength = Math.min(score, 100);
  return this.strength;
};

// Static method to find weak passwords
passwordSchema.statics.findWeakPasswords = function(userId) {
  return this.find({
    userId,
    $or: [
      { strength: { $lt: 50 } },
      { password: { $regex: /^.{1,7}$/ } }
    ]
  });
};

// Static method to find reused passwords
passwordSchema.statics.findReusedPasswords = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$password', count: { $sum: 1 }, entries: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);
};

const Password = mongoose.model('Password', passwordSchema);

module.exports = Password; 