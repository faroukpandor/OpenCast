import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0; let value = 0; let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { output += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0; let value = 0; const output: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret.');
    value = (value << 5) | index; bits += 5;
    if (bits >= 8) { output.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(output);
}

export function generateTotpSecret(): string { return base32Encode(randomBytes(20)); }

export function totpCode(secret: string, time = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(time / 1000 / step);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24 | digest[offset + 1] << 16 | digest[offset + 2] << 8 | digest[offset + 3]) % 10 ** digits;
  return String(code).padStart(digits, '0');
}

export function matchedTotpStep(secret: string, code: string, time = Date.now(), window = 1): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const expected = Buffer.from(code);
  for (let offset = -window; offset <= window; offset++) {
    const candidate = Buffer.from(totpCode(secret, time + offset * 30_000));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) return Math.floor(time / 30_000) + offset;
  }
  return null;
}

export function verifyTotp(secret: string, code: string, time = Date.now(), window = 1): boolean {
  return matchedTotpStep(secret, code, time, window) !== null;
}

export function otpauthUri(secret: string, account: string, issuer = 'OpenCast'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
