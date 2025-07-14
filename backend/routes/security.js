const express = require('express');
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

// Get security status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    res.json({
      twoFactorEnabled: false,
      lastLogin: new Date().toISOString(),
      securityScore: 85,
      threats: []
    });
  } catch (error) {
    console.error('Get security status error:', error);
    res.status(500).json({ message: 'Error fetching security status' });
  }
});

module.exports = router; 