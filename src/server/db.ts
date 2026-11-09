import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { classifyDeviceType } from '../utils/analytics_salt.ts';
import { proofOfWorkHash } from './crypto.ts';
import { generateTotpSecret, matchedTotpStep, otpauthUri } from './totp.ts';
import { findRelatedIssues } from '../utils/related_search.ts';
import { seedDevices, seedIssues, seedSolutions } from './seed.ts';
import type { CommentItem, Device, Issue, ShortcodeRecord, User } from '../types.ts';
export type { Device, Issue, Solution, CommentItem } from '../types.ts';

type Row = Record<string, any>;
const DAY = 86_400_000;
const PASSWORD_LENGTH = 64;
const hashPassword = (password: string, salt: string) => scryptSync(password, salt, PASSWORD_LENGTH, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const tokenHash = (token: string) => createHmac('sha256', 'opencast-session').update(token).digest('hex');
const safeUser = (row: Row): User => ({ id: row.id, username: row.username, email: row.email, role: row.role, mfa_enabled: !!row.mfa_enabled });

export class StreamingStore {
  readonly db: DatabaseSync;
  readonly retentionDays = 30;
  private analyticsSecret: string;
  constructor(path = ':memory:', options: { analyticsSecret?: string; admin?: { username: string; email: string; password: string } } = {}) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.migrate();
    this.analyticsSecret = options.analyticsSecret || this.setting('analytics_secret') || randomBytes(32).toString('hex');
    this.setSetting('analytics_secret', this.analyticsSecret);
    if (options.admin) this.ensureAdmin(options.admin);
    this.maintenance();
  }
  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS devices(id INTEGER PRIMARY KEY, name TEXT NOT NULL, ecosystem TEXT NOT NULL, release_date TEXT NOT NULL, specs_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS issues(id INTEGER PRIMARY KEY, device_id INTEGER NOT NULL REFERENCES devices(id), title TEXT NOT NULL, description TEXT NOT NULL, severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')), created_at TEXT NOT NULL, source_url TEXT UNIQUE, review_status TEXT NOT NULL DEFAULT 'reference');
      CREATE TABLE IF NOT EXISTS solutions(id INTEGER PRIMARY KEY, issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE, method TEXT NOT NULL, command_code TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, email TEXT NOT NULL COLLATE NOCASE UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','admin')), created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, page_slug TEXT NOT NULL, author_hash TEXT NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, content TEXT NOT NULL, proof_of_work_nonce TEXT NOT NULL, created_at TEXT NOT NULL, client_id TEXT UNIQUE);
      CREATE INDEX IF NOT EXISTS comments_slug ON comments(page_slug, id DESC);
      CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY, page_slug TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS analytics_events(id INTEGER PRIMARY KEY, page_url TEXT NOT NULL, referrer TEXT NOT NULL, device_type TEXT NOT NULL, daily_visitor_token TEXT NOT NULL, timestamp TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS analytics_time ON analytics_events(timestamp);
      CREATE TABLE IF NOT EXISTS shortcodes(code TEXT PRIMARY KEY, app_name TEXT NOT NULL, target_url TEXT NOT NULL, sha256 TEXT, version TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS password_reset_tokens(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS mfa_recovery_codes(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, code_hash TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY, hits INTEGER NOT NULL, reset_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS rate_limits_reset ON rate_limits(reset_at);
    `);
    const userColumns = this.db.prepare('PRAGMA table_info(users)').all() as Row[];
    if (!userColumns.some(c => c.name === 'mfa_secret')) this.db.exec('ALTER TABLE users ADD COLUMN mfa_secret TEXT;');
    if (!userColumns.some(c => c.name === 'mfa_enabled')) this.db.exec('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0;');
    if (!userColumns.some(c => c.name === 'mfa_last_step')) this.db.exec('ALTER TABLE users ADD COLUMN mfa_last_step INTEGER NOT NULL DEFAULT -1;');
    // Apply reviewed safety corrections to the built-in reference rows once; preserve community data.
    if (!this.setting('reference_safety_v2')) this.transaction(() => {
      for (const d of seedDevices) this.db.prepare('UPDATE devices SET specs_json=? WHERE id=?').run(JSON.stringify(d.specs),d.id);
      for (const issue of seedIssues) this.db.prepare("UPDATE issues SET title=?,description=?,severity=? WHERE id=? AND source_url IS NULL").run(issue.title,issue.description,issue.severity,issue.id);
      for (const solution of seedSolutions) this.db.prepare('UPDATE solutions SET method=?,command_code=? WHERE id=? AND issue_id IN (SELECT id FROM issues WHERE source_url IS NULL)').run(solution.method,solution.command_code,solution.issue_id);
      this.setSetting('reference_safety_v2','1');
    });
    const columns=this.db.prepare('PRAGMA table_info(comments)').all() as Row[];
    if (!columns.some(c => c.name==='client_id')) { this.db.exec('ALTER TABLE comments ADD COLUMN client_id TEXT; CREATE UNIQUE INDEX IF NOT EXISTS comments_client_id ON comments(client_id);'); }
    if (!this.db.prepare('SELECT key FROM settings WHERE key = ?').get('catalog_seeded')) {
      this.transaction(() => {
        for (const d of seedDevices) this.db.prepare('INSERT OR IGNORE INTO devices VALUES (?,?,?,?,?)').run(d.id, d.name, d.ecosystem, d.release_date, JSON.stringify(d.specs));
        for (const i of seedIssues) this.db.prepare('INSERT OR IGNORE INTO issues (id,device_id,title,description,severity,created_at) VALUES (?,?,?,?,?,?)').run(i.id, i.device_id, i.title, i.description, i.severity, i.created_at || new Date().toISOString());
        for (const s of seedSolutions) this.db.prepare('INSERT OR IGNORE INTO solutions VALUES (?,?,?,?)').run(s.id, s.issue_id, s.method, s.command_code);
        const defaults = [
          ['20002', 'SmartTube (upstream release)', 'https://github.com/yuliskov/SmartTube/releases/latest', 'upstream'],
          ['30003', 'Projectivy Launcher (upstream release)', 'https://github.com/spocky/projengmenu/releases/latest', 'upstream'],
          ['40004', 'Kodi (official downloads)', 'https://kodi.tv/download/android/', 'upstream']
        ];
        for (const row of defaults) this.db.prepare('INSERT OR IGNORE INTO shortcodes VALUES (?,?,?,?,?,?)').run(row[0], row[1], row[2], null, row[3], new Date().toISOString());
        this.setSetting('catalog_seeded', '1');
      });
    }
  }
  transaction<T>(fn: () => T): T { this.db.exec('BEGIN IMMEDIATE'); try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (e) { this.db.exec('ROLLBACK'); throw e; } }
  setting(key: string) { return (this.db.prepare('SELECT value FROM settings WHERE key=?').get(key) as Row | undefined)?.value as string | undefined; }
  setSetting(key: string, value: string) { this.db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value); }
  maintenance(now = Date.now()) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    this.db.prepare('DELETE FROM challenges WHERE expires_at < ?').run(now);
    this.db.prepare('DELETE FROM analytics_events WHERE timestamp < ?').run(new Date(now - this.retentionDays * DAY).toISOString());
    this.db.prepare('DELETE FROM password_reset_tokens WHERE expires_at < ?').run(now);
    this.db.prepare('DELETE FROM rate_limits WHERE reset_at <= ?').run(now);
  }
  close() { this.db.close(); }
  private device(row: Row): Device { return { id: row.id, name: row.name, ecosystem: row.ecosystem, release_date: row.release_date, specs: JSON.parse(row.specs_json), issues_count: row.issues_count }; }
  getDevices(ecosystem?: string): Device[] {
    const rows = this.db.prepare('SELECT d.*, (SELECT COUNT(*) FROM issues i WHERE i.device_id=d.id) issues_count FROM devices d ORDER BY d.id').all() as Row[];
    return rows.map(r => this.device(r)).filter(d => !ecosystem || ecosystem === 'All' || d.ecosystem.toLowerCase() === ecosystem.toLowerCase());
  }
  getDeviceById(id: number) { const device = this.getDevices().find(d => d.id === id); return device ? { ...device, issues: this.getIssues({ device_id: id }) } : null; }
  private issue(row: Row): Issue {
    const solutions = this.db.prepare('SELECT * FROM solutions WHERE issue_id=? ORDER BY id').all(row.id) as unknown as Issue['solutions'];
    return { id: row.id, device_id: row.device_id, title: row.title, description: row.description, severity: row.severity, created_at: row.created_at, ecosystem: row.ecosystem, device_name: row.device_name, source_url: row.source_url, review_status: row.review_status, solutions, solutions_count: solutions?.length || 0 };
  }
  private issueQuery = 'SELECT i.*,d.name device_name,d.ecosystem FROM issues i JOIN devices d ON d.id=i.device_id';
  getIssues(options: { device_id?: number; severity?: string; search?: string } = {}): Issue[] {
    const rows = this.db.prepare(this.issueQuery + ' ORDER BY i.id DESC').all() as Row[];
    const q = options.search?.trim().toLowerCase();
    return rows.map(r => this.issue(r)).filter(i => (!options.device_id || i.device_id === options.device_id) && (!options.severity || options.severity === 'all' || i.severity === options.severity) && (!q || `${i.title} ${i.description} ${i.device_name}`.toLowerCase().includes(q)));
  }
  getIssueById(id: number) { const row = this.db.prepare(this.issueQuery + ' WHERE i.id=?').get(id) as Row | undefined; return row ? this.issue(row) : null; }
  getRelatedIssues(id: number, limit = 5) { const target = this.getIssueById(id); return target ? findRelatedIssues(target, this.getIssues(), limit).map(i => ({ ...i, matched_keywords: i.matchedKeywords })) : []; }
  ensureAdmin(data: { username: string; email: string; password: string }) {
    if (this.db.prepare('SELECT id FROM users WHERE username=? OR email=?').get(data.username,data.email)) return;
    this.createUser(data.username,data.email,data.password,'admin');
  }
  createUser(username: string, email: string, password: string, role: 'admin' | 'member' = 'member') {
    const salt = randomBytes(16).toString('hex'); const hash = hashPassword(password,salt).toString('hex');
    const result = this.db.prepare('INSERT INTO users (username,email,salt,hash,role,created_at) VALUES (?,?,?,?,?,?)').run(username,email,salt,hash,role,new Date().toISOString());
    return this.getUserById(Number(result.lastInsertRowid))!;
  }
  private getUserById(id: number) { const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(id) as Row | undefined; return row ? safeUser(row) : null; }
  private session(user: User) { const token = randomBytes(32).toString('hex'); this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(tokenHash(token),user.id,Date.now()+7*DAY); return { token, user }; }
  registerUser(username: string,email: string,password: string) { return this.session(this.createUser(username,email,password)); }
  loginUser(identity: string,password: string,mfaCode?: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(identity,identity) as Row | undefined;
    const computed = hashPassword(password,row?.salt || '00000000000000000000000000000000');
    const stored = Buffer.from(row?.hash || '00'.repeat(PASSWORD_LENGTH),'hex');
    if (!row || stored.length !== computed.length || !timingSafeEqual(stored,computed)) throw new Error('Invalid username/email or password.');
    if (row.mfa_enabled) {
      if (!mfaCode) throw Object.assign(new Error('Authenticator code required.'), { code: 'MFA_REQUIRED' });
      if (!this.consumeMfaCode(row, mfaCode)) throw new Error('Invalid authenticator or recovery code.');
    }
    return this.session(safeUser(row));
  }
  getUserByToken(token: string) { const row = this.db.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?').get(tokenHash(token),Date.now()) as Row | undefined; return row ? safeUser(row) : null; }
  logoutUser(token: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token)); return true; }
  private mfaKey() { return createHash('sha256').update(`${this.analyticsSecret}:mfa:v1`).digest(); }
  private encryptMfaSecret(secret: string) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.mfaKey(), iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return JSON.stringify({ iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: encrypted.toString('hex') });
  }
  private decryptMfaSecret(stored: string) {
    const { iv, tag, data } = JSON.parse(stored) as { iv: string; tag: string; data: string };
    const decipher = createDecipheriv('aes-256-gcm', this.mfaKey(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
  }
  private verifyPassword(row: Row, password: string) {
    const computed = hashPassword(password, row.salt); const stored = Buffer.from(row.hash, 'hex');
    return stored.length === computed.length && timingSafeEqual(stored, computed);
  }
  private recoveryHash(code: string) { return createHmac('sha256', this.analyticsSecret).update(`mfa-recovery:${code.toUpperCase()}`).digest('hex'); }
  listUsers(): User[] { return (this.db.prepare('SELECT * FROM users ORDER BY id').all() as Row[]).map(safeUser); }
  beginMfa(userId: number) {
    const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as Row | undefined;
    if (!row) throw new Error('User not found.');
    if (row.mfa_enabled) throw new Error('MFA is already enabled.');
    const secret = generateTotpSecret();
    this.db.prepare('UPDATE users SET mfa_secret=?,mfa_enabled=0,mfa_last_step=-1 WHERE id=?').run(this.encryptMfaSecret(secret), userId);
    return { secret, otpauth_uri: otpauthUri(secret, row.username) };
  }
  enableMfa(userId: number, code: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as Row | undefined;
    if (!row?.mfa_secret) throw new Error('Start MFA setup first.');
    if (row.mfa_enabled) throw new Error('MFA is already enabled.');
    const secret = this.decryptMfaSecret(row.mfa_secret);
    const step = matchedTotpStep(secret, code);
    if (step === null) throw new Error('Invalid authenticator code.');
    const codes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'));
    this.transaction(() => {
      this.db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId);
      const insert = this.db.prepare('INSERT INTO mfa_recovery_codes (user_id,code_hash,used) VALUES (?,?,0)');
      for (const code of codes) insert.run(userId, this.recoveryHash(code));
      this.db.prepare('UPDATE users SET mfa_enabled=1,mfa_last_step=? WHERE id=?').run(step, userId);
    });
    return { recovery_codes: codes };
  }
  private consumeMfaCode(row: Row, code: string): boolean {
    const normalized = code.trim().toUpperCase();
    const recovery = this.db.prepare('SELECT id FROM mfa_recovery_codes WHERE user_id=? AND code_hash=? AND used=0').get(row.id, this.recoveryHash(normalized)) as Row | undefined;
    if (recovery) { this.db.prepare('UPDATE mfa_recovery_codes SET used=1 WHERE id=?').run(recovery.id); return true; }
    const step = row.mfa_secret ? matchedTotpStep(this.decryptMfaSecret(row.mfa_secret), normalized) : null;
    if (step === null || step <= row.mfa_last_step) return false;
    this.db.prepare('UPDATE users SET mfa_last_step=? WHERE id=?').run(step, row.id);
    return true;
  }
  disableMfa(userId: number, password: string, code: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as Row | undefined;
    if (!row || !this.verifyPassword(row, password)) throw new Error('Invalid password.');
    if (row.mfa_enabled && !this.consumeMfaCode(row, code)) throw new Error('Invalid authenticator or recovery code.');
    this.transaction(() => {
      this.db.prepare('UPDATE users SET mfa_secret=NULL,mfa_enabled=0,mfa_last_step=-1 WHERE id=?').run(userId);
      this.db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId);
    });
  }
  changePassword(userId: number, currentPassword: string, newPassword: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as Row | undefined;
    if (!row || !this.verifyPassword(row, currentPassword)) throw new Error('Invalid current password.');
    const salt = randomBytes(16).toString('hex'); const hash = hashPassword(newPassword, salt).toString('hex');
    this.transaction(() => {
      this.db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt, hash, userId);
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
      this.db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(userId);
    });
  }
  createPasswordResetToken(userId: number) {
    if (!this.db.prepare('SELECT id FROM users WHERE id=?').get(userId)) throw new Error('User not found.');
    const token = randomBytes(32).toString('hex'); const expiresAt = Date.now() + 60 * 60_000;
    this.db.prepare('INSERT INTO password_reset_tokens VALUES (?,?,?,0)').run(tokenHash(token), userId, expiresAt);
    return { token, expires_at: new Date(expiresAt).toISOString() };
  }
  resetPassword(token: string, newPassword: string) {
    const row = this.db.prepare('SELECT * FROM password_reset_tokens WHERE token_hash=? AND used=0 AND expires_at>?').get(tokenHash(token), Date.now()) as Row | undefined;
    if (!row) throw new Error('Reset token is invalid or expired.');
    const salt = randomBytes(16).toString('hex'); const hash = hashPassword(newPassword, salt).toString('hex');
    this.transaction(() => {
      this.db.prepare('UPDATE users SET salt=?,hash=? WHERE id=?').run(salt, hash, row.user_id);
      this.db.prepare('UPDATE password_reset_tokens SET used=1 WHERE token_hash=?').run(tokenHash(token));
      this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
      this.db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(row.user_id);
    });
  }
  deleteAccount(userId: number, password: string, mfaCode?: string) {
    const row = this.db.prepare('SELECT * FROM users WHERE id=?').get(userId) as Row | undefined;
    if (!row || !this.verifyPassword(row, password)) throw new Error('Invalid password.');
    if (row.mfa_enabled && (!mfaCode || !this.consumeMfaCode(row, mfaCode))) throw new Error('Invalid authenticator or recovery code.');
    this.transaction(() => {
      this.db.prepare('DELETE FROM comments WHERE user_id=?').run(userId);
      this.db.prepare('DELETE FROM users WHERE id=?').run(userId);
    });
  }
  deleteComment(commentId: number, actor: User) {
    const row = this.db.prepare('SELECT * FROM comments WHERE id=?').get(commentId) as Row | undefined;
    if (!row) throw new Error('Comment not found.');
    if (actor.role !== 'admin' && row.user_id !== actor.id) throw new Error('Not allowed to delete this comment.');
    this.db.prepare('DELETE FROM comments WHERE id=?').run(commentId);
  }
  reviewIssue(issueId: number, status: 'reference' | 'unreviewed') {
    const result = this.db.prepare('UPDATE issues SET review_status=? WHERE id=?').run(status, issueId);
    if (!result.changes) throw new Error('Issue not found.');
  }
  deleteIssue(issueId: number) {
    const result = this.db.prepare('DELETE FROM issues WHERE id=?').run(issueId);
    if (!result.changes) throw new Error('Issue not found.');
  }
  createChallenge(pageSlug: string) { const id = randomUUID(); const expiresAt = Date.now()+10*60_000; this.db.prepare('INSERT INTO challenges VALUES (?,?,?,0)').run(id,pageSlug,expiresAt); return { challenge: id, difficulty: '0000', expires_at: new Date(expiresAt).toISOString() }; }
  addComment(data: { page_slug: string; content: string; nonce: string; challenge: string; client_id: string }, user: User | null = null) {
    return this.transaction(() => {
      const existing=this.db.prepare('SELECT * FROM comments WHERE client_id=?').get(data.client_id) as Row | undefined;
      if (existing) { if(existing.page_slug!==data.page_slug || existing.content!==data.content) throw new Error('Submission ID was already used for different content.'); return this.getComment(existing.id); }
      const challenge = this.db.prepare('SELECT * FROM challenges WHERE id=? AND page_slug=?').get(data.challenge,data.page_slug) as Row | undefined;
      if (!challenge || challenge.used || challenge.expires_at <= Date.now()) throw new Error('Challenge expired or already used. Please retry.');
      const hash = proofOfWorkHash(data.challenge,data.page_slug,data.content,data.nonce);
      if (!hash.startsWith('0000')) throw new Error('Invalid proof of work. Please retry.');
      this.db.prepare('UPDATE challenges SET used=1 WHERE id=?').run(data.challenge);
      const authorHash = createHmac('sha256',this.analyticsSecret).update(user ? `user:${user.id}` : `challenge:${data.challenge}`).digest('hex').slice(0,12);
      const result = this.db.prepare('INSERT INTO comments (page_slug,author_hash,user_id,content,proof_of_work_nonce,created_at,client_id) VALUES (?,?,?,?,?,?,?)').run(data.page_slug,authorHash,user?.id || null,data.content,data.nonce,new Date().toISOString(),data.client_id);
      return this.getComment(Number(result.lastInsertRowid));
    });
  }
  private getComment(id: number): CommentItem { return this.db.prepare("SELECT c.*,COALESCE(u.username,'Anonymous #' || c.author_hash) author_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.id=?").get(id) as unknown as CommentItem; }
  getComments(slug: string,limit=100) { return this.db.prepare("SELECT c.*,COALESCE(u.username,'Anonymous #' || c.author_hash) author_name FROM comments c LEFT JOIN users u ON u.id=c.user_id WHERE c.page_slug=? ORDER BY c.id DESC LIMIT ?").all(slug,limit) as unknown as CommentItem[]; }
  trackEvent(page: string,referrer: string,userAgent: string,ip: string,now = new Date()) {
    const day = now.toISOString().slice(0,10);
    const token = createHmac('sha256',this.analyticsSecret).update(`${day}:${ip}`).digest('hex').slice(0,32);
    this.db.prepare('INSERT INTO analytics_events (page_url,referrer,device_type,daily_visitor_token,timestamp) VALUES (?,?,?,?,?)').run(page,referrer || 'Direct',classifyDeviceType(userAgent),token,now.toISOString());
    return { device_type: classifyDeviceType(userAgent) };
  }
  getStats(now = new Date()) {
    const today = now.toISOString().slice(0,10);
    const count = (sql: string,...params: any[]) => Number((this.db.prepare(sql).get(...params) as Row).n);
    const grouped = (column: 'page_url' | 'referrer') => {
      const rows = column === 'page_url'
        ? this.db.prepare('SELECT page_url k,COUNT(*) hits FROM analytics_events GROUP BY page_url ORDER BY hits DESC,k LIMIT 8').all()
        : this.db.prepare('SELECT referrer k,COUNT(*) hits FROM analytics_events GROUP BY referrer ORDER BY hits DESC,k LIMIT 8').all();
      return rows.map((r: any) => ({ [column === 'page_url' ? 'page' : 'referrer']: r.k, hits: r.hits }));
    };
    return { total_views: count('SELECT COUNT(*) n FROM analytics_events'), views_today: count('SELECT COUNT(*) n FROM analytics_events WHERE substr(timestamp,1,10)=?',today), unique_visitors_today: count('SELECT COUNT(DISTINCT daily_visitor_token) n FROM analytics_events WHERE substr(timestamp,1,10)=?',today), top_pages: grouped('page_url'), top_referrers: grouped('referrer'), device_breakdown: Object.fromEntries(this.db.prepare('SELECT device_type,COUNT(*) n FROM analytics_events GROUP BY device_type').all().map((r: any) => [r.device_type,r.n])), retention_days: this.retentionDays };
  }
  private shortcode(r: Row): ShortcodeRecord { return { code: r.code, appName: r.app_name, targetUrl: r.target_url, sha256: r.sha256 || undefined, version: r.version, createdAt: r.created_at }; }
  getShortcodes() { return (this.db.prepare('SELECT * FROM shortcodes ORDER BY code').all() as Row[]).map(r => this.shortcode(r)); }
  resolveShortcode(code: string) { const r = this.db.prepare('SELECT * FROM shortcodes WHERE code=?').get(code) as Row | undefined; return r ? this.shortcode(r) : null; }
  generateShortcode(appName: string,targetUrl: string,sha256?: string,version='1.0.0') {
    const url = new URL(targetUrl); if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use an HTTPS URL without embedded credentials.');
    let code: string; do { code = String(randomInt(10000,100000)); } while (this.resolveShortcode(code));
    this.db.prepare('INSERT INTO shortcodes VALUES (?,?,?,?,?,?)').run(code,appName,url.href,sha256 || null,version,new Date().toISOString());
    return this.resolveShortcode(code)!;
  }
  ingestIssue(data: { device_id: number; title: string; description: string; severity: Issue['severity']; source_url: string }) {
    const result = this.db.prepare("INSERT INTO issues (device_id,title,description,severity,created_at,source_url,review_status) VALUES (?,?,?,?,?,?,'unreviewed') ON CONFLICT(source_url) DO NOTHING").run(data.device_id,data.title,data.description,data.severity,data.source_url ? new Date().toISOString() : '',data.source_url);
    return result.changes > 0;
  }
}
