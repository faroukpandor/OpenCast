// Isomorphic helpers. A challenge binds a nonce to one page and one submission.
export function proofOfWorkPayload(challenge: string, pageSlug: string, content: string, nonce: string) {
  return JSON.stringify([challenge, pageSlug, content, nonce]);
}
export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
}
export async function mineProofOfWork(challenge: string, pageSlug: string, content: string, difficulty = '0000', signal?: AbortSignal, onProgress?: (attempts: number) => void) {
  for (let attempt = 0; attempt < 2_000_000; attempt++) {
    signal?.throwIfAborted();
    const nonce = attempt.toString(36);
    const hash = await sha256Hex(proofOfWorkPayload(challenge,pageSlug,content,nonce));
    if (hash.startsWith(difficulty)) return { nonce, hash, attempts: attempt + 1 };
    if (attempt % 100 === 0) { onProgress?.(attempt); await new Promise(r => setTimeout(r,0)); }
  }
  throw new Error('Proof-of-work limit reached. Please retry.');
}
