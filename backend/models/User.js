const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    select: false
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false
  },
  pendingMfaSecret: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function matchPassword(candidate) {
  if (!/^\$2[aby]\$/.test(this.password)) {
    const supplied = Buffer.from(String(candidate));
    const stored = Buffer.from(String(this.password));
    return Promise.resolve(supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored));
  }
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
