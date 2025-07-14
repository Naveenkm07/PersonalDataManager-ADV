const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Website must be a valid HTTP/HTTPS URL'
    }
  },
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  notes: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['personal', 'work', 'family', 'emergency', 'other'],
    default: 'personal'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isFavorite: {
    type: Boolean,
    default: false
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  birthday: {
    type: Date
  },
  anniversary: {
    type: Date
  },
  lastContact: {
    type: Date,
    default: Date.now
  },
  contactFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'rarely'],
    default: 'monthly'
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

// Indexes for better query performance
contactSchema.index({ userId: 1, firstName: 1, lastName: 1 });
contactSchema.index({ userId: 1, email: 1 });
contactSchema.index({ userId: 1, category: 1 });
contactSchema.index({ userId: 1, tags: 1 });
contactSchema.index({ userId: 1, isEmergency: 1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Method to update last contact
contactSchema.methods.updateLastContact = function() {
  this.lastContact = Date.now();
  return this.save();
};

// Static method to find contacts by category
contactSchema.statics.findByCategory = function(userId, category) {
  return this.find({ userId, category });
};

// Static method to find emergency contacts
contactSchema.statics.findEmergencyContacts = function(userId) {
  return this.find({ userId, isEmergency: true });
};

// Static method to find contacts with upcoming birthdays
contactSchema.statics.findUpcomingBirthdays = function(userId, days = 30) {
  const today = new Date();
  const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    userId,
    birthday: {
      $gte: today,
      $lte: futureDate
    }
  });
};

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact; 