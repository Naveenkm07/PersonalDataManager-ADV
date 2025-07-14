const mongoose = require('mongoose');
const crypto = require('crypto');

const secureNoteSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true
  },
  encryptedContent: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'finance', 'health', 'travel', 'ideas', 'other'],
    default: 'personal'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isEncrypted: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  color: {
    type: String,
    default: '#ffffff'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  version: {
    type: Number,
    default: 1
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
secureNoteSchema.index({ userId: 1, title: 1 });
secureNoteSchema.index({ userId: 1, category: 1 });
secureNoteSchema.index({ userId: 1, tags: 1 });
secureNoteSchema.index({ userId: 1, isPinned: 1 });
secureNoteSchema.index({ userId: 1, isArchived: 1 });

// Pre-save middleware to encrypt content
secureNoteSchema.pre('save', function(next) {
  if (this.isModified('content') && this.isEncrypted) {
    this.encryptContent();
  }
  this.lastModified = Date.now();
  next();
});

// Method to encrypt content
secureNoteSchema.methods.encryptContent = function() {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(this.content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  this.encryptedContent = iv.toString('hex') + ':' + encrypted;
};

// Method to decrypt content
secureNoteSchema.methods.decryptContent = function() {
  if (!this.isEncrypted) {
    return this.content;
  }
  
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const parts = this.encryptedContent.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return 'Error decrypting content';
  }
};

// Method to create new version
secureNoteSchema.methods.createVersion = function() {
  this.version += 1;
  return this.save();
};

// Static method to find notes by category
secureNoteSchema.statics.findByCategory = function(userId, category) {
  return this.find({ userId, category, isArchived: false });
};

// Static method to find pinned notes
secureNoteSchema.statics.findPinnedNotes = function(userId) {
  return this.find({ userId, isPinned: true, isArchived: false });
};

// Static method to search notes
secureNoteSchema.statics.searchNotes = function(userId, searchTerm) {
  return this.find({
    userId,
    isArchived: false,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  });
};

const SecureNote = mongoose.model('SecureNote', secureNoteSchema);

module.exports = SecureNote; 