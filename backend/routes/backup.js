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

// Get backup status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    res.json({
      lastBackup: new Date().toISOString(),
      status: 'ready',
      autoBackup: true
    });
  } catch (error) {
    console.error('Get backup status error:', error);
    res.status(500).json({ message: 'Error fetching backup status' });
  }
});

module.exports = router; 