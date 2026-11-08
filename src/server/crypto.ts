import { createHash } from 'node:crypto';
import { proofOfWorkPayload } from '../utils/crypto_pow.ts';
export function proofOfWorkHash(challenge: string, slug: string, content: string, nonce: string) {
  return createHash('sha256').update(proofOfWorkPayload(challenge,slug,content,nonce)).digest('hex');
}
