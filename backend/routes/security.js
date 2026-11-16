const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateSecret, verifyCode, encryptSecret, decryptSecret } = require('../security/totp');

const router = express.Router();

router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('mfaEnabled');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ mfaEnabled: user.mfaEnabled, role: req.user.role || 'user' });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching security status' });
  }
});

router.post('/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('+pendingMfaSecret mfaEnabled');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.mfaEnabled) return res.status(409).json({ message: 'MFA is already enabled' });
    const secret = generateSecret();
    user.pendingMfaSecret = encryptSecret(secret);
    await user.save();
    const label = encodeURIComponent(`SecureVault:${user.email}`);
    const issuer = encodeURIComponent('SecureVault');
    return res.json({ secret, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
  } catch (error) {
    if (error.message.startsWith('MFA_ENCRYPTION_KEY')) return res.status(503).json({ message: 'MFA is not configured on this server' });
    return res.status(500).json({ message: 'Unable to start MFA setup' });
  }
});

router.post('/mfa/enable', authenticateToken, [body('code').matches(/^\d{6}$/)], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Enter a six-digit authenticator code' });
  try {
    const user = await User.findById(req.user.userId).select('+pendingMfaSecret +mfaSecret mfaEnabled');
    if (!user || !user.pendingMfaSecret) return res.status(409).json({ message: 'Start MFA setup first' });
    const secret = decryptSecret(user.pendingMfaSecret);
    if (!verifyCode(secret, req.body.code)) return res.status(400).json({ message: 'Invalid or expired verification code' });
    user.mfaSecret = user.pendingMfaSecret;
    user.pendingMfaSecret = undefined;
    user.mfaEnabled = true;
    await user.save();
    await Analytics.create({ userId: user._id, type: 'security_event', action: 'update', entity: 'user', success: true, ipAddress: req.ip, userAgent: req.get('User-Agent'), metadata: { event: 'mfa_enabled' } });
    return res.json({ mfaEnabled: true });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to enable MFA' });
  }
});

router.post('/mfa/disable', authenticateToken, [body('password').notEmpty(), body('code').matches(/^\d{6}$/)], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Password and six-digit authenticator code are required' });
  try {
    const user = await User.findById(req.user.userId).select('+password +mfaSecret mfaEnabled');
    if (!user || !user.mfaEnabled || !user.mfaSecret) return res.status(409).json({ message: 'MFA is not enabled' });
    const validPassword = await user.matchPassword(req.body.password);
    if (!validPassword || !verifyCode(decryptSecret(user.mfaSecret), req.body.code)) {
      return res.status(401).json({ message: 'Invalid credentials or verification code' });
    }
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    await user.save();
    await Analytics.create({ userId: user._id, type: 'security_event', action: 'update', entity: 'user', success: true, ipAddress: req.ip, userAgent: req.get('User-Agent'), metadata: { event: 'mfa_disabled' } });
    return res.json({ mfaEnabled: false });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to disable MFA' });
  }
});

router.get('/audit', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const events = await Analytics.find({ type: { $in: ['login', 'security_event'] } })
      .select('-__v').sort({ timestamp: -1 }).limit(200).lean();
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ message: 'Unable to retrieve audit events' });
  }
});

module.exports = router;
