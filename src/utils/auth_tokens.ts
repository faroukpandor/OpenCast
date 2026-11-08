import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Hashes a plain text password using PBKDF2-HMAC-SHA256 with a unique salt.
 * Standard secure password storage.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

/**
 * Verifies a password against the stored salt and hash using timing-safe comparison.
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const computedHash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
    const a = Buffer.from(computedHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically random session/auth token.
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}
