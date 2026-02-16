import crypto from 'crypto';

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

export function verifyPassword(password: string, hash: string) {
  const parts = hash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'base64');
  const expected = Buffer.from(parts[2], 'base64');
  const derivedKey = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(derivedKey, expected);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function hmacSha256Base64Url(secret: string, value: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

