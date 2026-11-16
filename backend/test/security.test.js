const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSecret, codeAt, verifyCode, encryptSecret, decryptSecret } = require('../security/totp');
const { authenticateToken, issueToken, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('TOTP accepts the current authenticator code and rejects malformed or wrong codes', () => {
  assert.equal(codeAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1), '287082');
  const secret = generateSecret();
  const now = 1_700_000_000_000;
  const code = codeAt(secret, Math.floor(now / 1000 / 30));
  assert.equal(verifyCode(secret, code, now), true);
  assert.equal(verifyCode(secret, '12345', now), false);
  assert.equal(verifyCode(secret, '000000', now), false);
});

test('MFA secrets are encrypted and can be recovered only with the configured key', () => {
  process.env.MFA_ENCRYPTION_KEY = 'unit-test-key-that-is-at-least-32-chars';
  const encrypted = encryptSecret('ABCDEFGHIJKLMNOP');
  assert.notEqual(encrypted, 'ABCDEFGHIJKLMNOP');
  assert.equal(decryptSecret(encrypted), 'ABCDEFGHIJKLMNOP');
  delete process.env.MFA_ENCRYPTION_KEY;
  assert.throws(() => decryptSecret(encrypted), /MFA_ENCRYPTION_KEY/);
});

test('JWT authentication signs and verifies only the configured HS256 token', () => {
  process.env.JWT_SECRET = 'unit-test-jwt-secret-that-is-at-least-32-chars';
  const token = issueToken({ _id: { toString: () => 'user-1' }, role: 'admin' });
  const req = { get: () => `Bearer ${token}` };
  const res = response();
  let continued = false;
  authenticateToken(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(req.user.role, 'admin');

  process.env.JWT_SECRET = 'your-secret-key';
  const misconfiguredResponse = response();
  authenticateToken(req, misconfiguredResponse, () => assert.fail('must fail closed'));
  assert.equal(misconfiguredResponse.statusCode, 503);
  delete process.env.JWT_SECRET;
});

test('RBAC denies a user role and allows an explicitly required role', () => {
  const denied = response();
  requireRole('admin')({ user: { role: 'user' } }, denied, () => assert.fail('must deny'));
  assert.equal(denied.statusCode, 403);

  let continued = false;
  requireRole('admin')({ user: { role: 'admin' } }, response(), () => { continued = true; });
  assert.equal(continued, true);
});

test('account password verification supports legacy plaintext migration and bcrypt hashes', async () => {
  const legacy = new User({ name: 'Test', email: 'legacy@example.test', password: 'LegacyPass123!' });
  assert.equal(await legacy.matchPassword('LegacyPass123!'), true);
  assert.equal(await legacy.matchPassword('wrong'), false);

  const hashed = new User({ name: 'Test', email: 'hashed@example.test', password: await bcrypt.hash('NewPass123!', 12) });
  assert.equal(await hashed.matchPassword('NewPass123!'), true);
  assert.equal(await hashed.matchPassword('wrong'), false);
});
