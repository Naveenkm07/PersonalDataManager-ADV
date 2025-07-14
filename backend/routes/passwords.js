const express = require('express');
const { body, validationResult } = require('express-validator');
const Password = require('../models/Password');
const Analytics = require('../models/Analytics');

const router = express.Router();

// Middleware to validate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get all passwords for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const passwords = await Password.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 });

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(passwords);
  } catch (error) {
    console.error('Get passwords error:', error);
    res.status(500).json({ message: 'Error fetching passwords' });
  }
});

// Get password by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const password = await Password.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      entityId: password._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(password);
  } catch (error) {
    console.error('Get password error:', error);
    res.status(500).json({ message: 'Error fetching password' });
  }
});

// Create new password
router.post('/', authenticateToken, [
  body('title').notEmpty().trim(),
  body('username').notEmpty().trim(),
  body('password').notEmpty(),
  body('url').optional().isURL(),
  body('category').optional().isIn(['social', 'work', 'finance', 'shopping', 'entertainment', 'other']),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const passwordData = {
      ...req.body,
      userId: req.user.userId
    };

    const password = new Password(passwordData);
    
    // Calculate password strength
    password.calculateStrength();
    
    await password.save();

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'create',
      entity: 'password',
      entityId: password._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json(password);
  } catch (error) {
    console.error('Create password error:', error);
    res.status(500).json({ message: 'Error creating password' });
  }
});

// Update password
router.put('/:id', authenticateToken, [
  body('title').optional().notEmpty().trim(),
  body('username').optional().notEmpty().trim(),
  body('password').optional().notEmpty(),
  body('url').optional().isURL(),
  body('category').optional().isIn(['social', 'work', 'finance', 'shopping', 'entertainment', 'other']),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const password = await Password.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        password[key] = req.body[key];
      }
    });

    // Recalculate strength if password changed
    if (req.body.password) {
      password.calculateStrength();
    }

    await password.save();

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'update',
      entity: 'password',
      entityId: password._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(password);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
});

// Delete password
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const password = await Password.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!password) {
      return res.status(404).json({ message: 'Password not found' });
    }

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'delete',
      entity: 'password',
      entityId: req.params.id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Password deleted successfully' });
  } catch (error) {
    console.error('Delete password error:', error);
    res.status(500).json({ message: 'Error deleting password' });
  }
});

// Get weak passwords
router.get('/weak/all', authenticateToken, async (req, res) => {
  try {
    const weakPasswords = await Password.findWeakPasswords(req.user.userId);
    
    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { weakPasswordsCount: weakPasswords.length }
    });

    res.json(weakPasswords);
  } catch (error) {
    console.error('Get weak passwords error:', error);
    res.status(500).json({ message: 'Error fetching weak passwords' });
  }
});

// Get reused passwords
router.get('/reused/all', authenticateToken, async (req, res) => {
  try {
    const reusedPasswords = await Password.findReusedPasswords(req.user.userId);
    
    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { reusedPasswordsCount: reusedPasswords.length }
    });

    res.json(reusedPasswords);
  } catch (error) {
    console.error('Get reused passwords error:', error);
    res.status(500).json({ message: 'Error fetching reused passwords' });
  }
});

// Search passwords
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const query = req.params.query;
    const passwords = await Password.find({
      userId: req.user.userId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
        { notes: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ updatedAt: -1 });

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { searchQuery: query, resultsCount: passwords.length }
    });

    res.json(passwords);
  } catch (error) {
    console.error('Search passwords error:', error);
    res.status(500).json({ message: 'Error searching passwords' });
  }
});

// Get passwords by category
router.get('/category/:category', authenticateToken, async (req, res) => {
  try {
    const passwords = await Password.find({
      userId: req.user.userId,
      category: req.params.category
    }).sort({ updatedAt: -1 });

    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'password_action',
      action: 'read',
      entity: 'password',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: { category: req.params.category, resultsCount: passwords.length }
    });

    res.json(passwords);
  } catch (error) {
    console.error('Get passwords by category error:', error);
    res.status(500).json({ message: 'Error fetching passwords by category' });
  }
});

module.exports = router; 