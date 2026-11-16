const crypto = require('crypto');

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of input.toUpperCase().replace(/=+$/, '')) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function codeAt(secret, counter) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1000000).padStart(6, '0');
}

function verifyCode(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return false;
  const counter = Math.floor(now / 1000 / 30);
  const supplied = Buffer.from(String(code));
  for (const drift of [-1, 0, 1]) {
    const expected = Buffer.from(codeAt(secret, counter + drift));
    if (crypto.timingSafeEqual(supplied, expected)) return true;
  }
  return false;
}

function encryptSecret(secret) {
  const keyInput = process.env.MFA_ENCRYPTION_KEY;
  if (!keyInput || keyInput.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be configured with at least 32 characters');
  }
  const key = crypto.createHash('sha256').update(keyInput).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.');
}

function decryptSecret(value) {
  const keyInput = process.env.MFA_ENCRYPTION_KEY;
  if (!keyInput || keyInput.length < 32) {
    throw new Error('MFA_ENCRYPTION_KEY must be configured with at least 32 characters');
  }
  const [iv, tag, ciphertext] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const key = crypto.createHash('sha256').update(keyInput).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { generateSecret, codeAt, verifyCode, encryptSecret, decryptSecret };
