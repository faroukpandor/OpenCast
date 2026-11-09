import type { DatabaseSync } from 'node:sqlite';
import type { Store, IncrementResponse, ClientRateLimitInfo, Options } from 'express-rate-limit';

/** SQLite-backed rate-limit store. Free/local, shared by processes using the same database. */
export class SqliteRateLimitStore implements Store {
  localKeys = false;
  private windowMs = 60_000;
  constructor(private db: DatabaseSync, public prefix: string, private now: () => number = Date.now) {}
  private key(key: string) { return `${this.prefix}:${key}`; }
  init(options: Options) { this.windowMs = options.windowMs; this.db.exec('CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS rate_limits_reset ON rate_limits(reset_at);'); }
  get(key: string): ClientRateLimitInfo | undefined {
    const row = this.db.prepare('SELECT hits,reset_at FROM rate_limits WHERE key=?').get(this.key(key)) as { hits: number; reset_at: number } | undefined;
    if (!row || row.reset_at <= this.now()) return undefined;
    return { totalHits: row.hits, resetTime: new Date(row.reset_at) };
  }
  increment(key: string): IncrementResponse {
    const now = this.now(); const fullKey = this.key(key);
    return this.transaction(() => {
      const row = this.db.prepare('SELECT hits,reset_at FROM rate_limits WHERE key=?').get(fullKey) as { hits: number; reset_at: number } | undefined;
      if (!row || row.reset_at <= now) {
        const resetAt = now + this.windowMs;
        this.db.prepare('INSERT INTO rate_limits(key,hits,reset_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET hits=1,reset_at=excluded.reset_at').run(fullKey,1,resetAt);
        return { totalHits: 1, resetTime: new Date(resetAt) };
      }
      const hits = row.hits + 1;
      this.db.prepare('UPDATE rate_limits SET hits=? WHERE key=?').run(hits,fullKey);
      return { totalHits: hits, resetTime: new Date(row.reset_at) };
    });
  }
  decrement(key: string) { this.db.prepare('UPDATE rate_limits SET hits=MAX(hits-1,0) WHERE key=?').run(this.key(key)); }
  resetKey(key: string) { this.db.prepare('DELETE FROM rate_limits WHERE key=?').run(this.key(key)); }
  resetAll() { this.db.prepare('DELETE FROM rate_limits WHERE key LIKE ?').run(this.prefix + ':%'); }
  shutdown() { this.db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(this.now()); }
  private transaction<T>(fn: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (error) { this.db.exec('ROLLBACK'); throw error; } }
}
