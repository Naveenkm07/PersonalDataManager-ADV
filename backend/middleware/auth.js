const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key' || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function authenticateToken(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  try {
    req.user = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    return next();
  } catch (error) {
    if (error.message.startsWith('JWT_SECRET')) {
      return res.status(503).json({ message: 'Authentication is not configured' });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}

function issueToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), id: user._id.toString(), role: user.role || 'user' },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h', algorithm: 'HS256' }
  );
}

module.exports = { authenticateToken, requireRole, issueToken };
