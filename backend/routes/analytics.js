const express = require('express');
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

// Get user analytics
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const analytics = await Analytics.find({ userId: req.user.userId })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

module.exports = router; 