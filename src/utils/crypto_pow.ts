import { createHash } from 'node:crypto';

/**
 * Validates whether a comment text combined with a nonce produces a SHA-256 hash
 * that satisfies the difficulty prefix (default: "000", requiring ~4096 attempts).
 */
export function verifyProofOfWork(
  commentText: string,
  nonce: string,
  requiredPrefix: string = '000'
): { valid: boolean; hash: string } {
  const payload = `${commentText}${nonce}`;
  const hash = createHash('sha256').update(payload).digest('hex');
  const valid = hash.startsWith(requiredPrefix);
  return { valid, hash };
}

/**
 * Mines a valid Proof of Work nonce synchronously or with iteration limits.
 * Used for testing and client-side mining.
 */
export function mineProofOfWorkSync(
  commentText: string,
  requiredPrefix: string = '000',
  maxIterations: number = 200000
): { nonce: string; hash: string; attempts: number } {
  let attempts = 0;
  while (attempts < maxIterations) {
    const nonce = attempts.toString(36);
    const payload = `${commentText}${nonce}`;
    const hash = createHash('sha256').update(payload).digest('hex');
    if (hash.startsWith(requiredPrefix)) {
      return { nonce, hash, attempts: attempts + 1 };
    }
    attempts++;
  }
  throw new Error(`Failed to mine PoW within ${maxIterations} attempts`);
}
