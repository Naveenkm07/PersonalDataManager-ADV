const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { issueToken } = require('../middleware/auth');
const { decryptSecret, verifyCode } = require('../security/totp');

const router = express.Router();

const { authenticateToken } = require('../middleware/auth');

function isConfiguredAdmin(userId) {
  const adminIds = (process.env.SECURITY_ADMIN_USER_IDS || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  return adminIds.includes(userId.toString());
}

// Register endpoint
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('username').isLength({ min: 3 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const user = await User.create({
      name: username,
      email,
      password,
      role: 'user'
    });

    // Generate token
    const token = issueToken(user);

    // Log analytics
    await Analytics.create({
      userId: user._id,
      type: 'login',
      action: 'create',
      entity: 'user',
      entityId: user._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+role +mfaSecret');
    if (!user) {
      await Analytics.create({
        userId: null,
        type: 'login',
        action: 'failed_login',
        entity: 'user',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        errorMessage: 'Invalid credentials'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await Analytics.create({
        userId: user._id,
        type: 'login',
        action: 'failed_login',
        entity: 'user',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        errorMessage: 'Invalid password'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Upgrade passwords stored in plaintext by older versions after a successful check.
    if (!/^\$2[aby]\$/.test(user.password)) {
      user.password = password;
      await user.save();
    }

    if (user.mfaEnabled && !req.body.otp) {
      return res.status(200).json({ mfaRequired: true });
    }
    if (user.mfaEnabled) {
      let secret;
      try {
        secret = decryptSecret(user.mfaSecret);
      } catch (error) {
        console.error('MFA secret could not be decrypted');
        return res.status(503).json({ message: 'MFA is temporarily unavailable' });
      }
      if (!verifyCode(secret, req.body.otp)) {
        await Analytics.create({
          userId: user._id, type: 'login', action: 'failed_login', entity: 'user', success: false,
          ipAddress: req.ip, userAgent: req.get('User-Agent'), errorMessage: 'Invalid MFA code'
        });
        return res.status(401).json({ message: 'Invalid credentials or verification code' });
      }
    }

    // Generate token
    user.role = user.role === 'admin' || isConfiguredAdmin(user._id) ? 'admin' : 'user';
    const token = issueToken(user);

    // Log analytics
    await Analytics.create({
      userId: user._id,
      type: 'login',
      action: 'login',
      entity: 'user',
      entityId: user._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.name,
        role: user.role,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+role -password -mfaSecret -pendingMfaSecret');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.role = req.user.role || user.role || 'user';
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('username').optional().isLength({ min: 3 }),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (req.body.username) user.name = req.body.username;
    if (req.body.email) user.email = req.body.email;

    await user.save();

    // Log analytics
    await Analytics.create({
      userId: user._id,
      type: 'login',
      action: 'update',
      entity: 'user',
      entityId: user._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      id: user._id,
      email: user.email,
      username: user.name
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log analytics
    await Analytics.create({
      userId: user._id,
      type: 'login',
      action: 'update',
      entity: 'user',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log analytics
    await Analytics.create({
      userId: req.user.userId,
      type: 'logout',
      action: 'logout',
      entity: 'user',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
});

module.exports = router;
