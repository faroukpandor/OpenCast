import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { StreamingStore } from './db.ts';
import type { User } from '../types.ts';
import { handleRagChat, buildRagExport } from './rag_chat_service.ts';
import { ScraperService } from './scraper_service.ts';
import { SqliteRateLimitStore } from './rate_limit_store.ts';

export interface ApiOptions { production?: boolean; analyticsSecret?: string; scraper?: ScraperService; rateLimits?: boolean; publicUrl?: string; youtubeChannels?: string[]; trustProxyHops?: number; cookieSecure?: boolean; scraperEnabled?: boolean; redditEnabled?: boolean; privacyContact?: string; operatorName?: string; }
const id = z.coerce.number().int().positive().safe();
const slug = z.string().regex(/^(issue|device)-[1-9]\d{0,8}$/).max(40);
const commentSchema = z.object({ page_slug: slug, content: z.string().trim().min(3).max(2000), nonce: z.string().min(1).max(40), challenge: z.string().uuid(), client_id: z.string().uuid() }).strict();
const registerSchema = z.object({ username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,30}$/), email: z.string().trim().email().max(254).transform(s => s.toLowerCase()), password: z.string().min(10).max(128) }).strict();
const chatSchema = z.object({ message: z.string().trim().min(1).max(2000), history: z.array(z.object({ role: z.enum(['user','model']), text: z.string().max(4000) }).strict()).max(6).default([]) }).strict();
const cookieName = 'opencast_session';
function sessionToken(req: Request) {
  const entry = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`));
  if (entry) { try { return decodeURIComponent(entry.slice(cookieName.length+1)); } catch { return ''; } }
  return req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : '';
}
export function createApi(store: StreamingStore, options: ApiOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Never trust arbitrary forwarded headers. Set exactly the number of trusted reverse proxies.
  app.set('trust proxy', Math.max(0,Math.min(5,options.trustProxyHops ?? 0)));
  app.use(helmet({ contentSecurityPolicy: options.production ? { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'","'unsafe-inline'"], imgSrc: ["'self'",'data:','blob:'], fontSrc: ["'self'",'data:'], connectSrc: ["'self'"], workerSrc: ["'self'",'blob:'], objectSrc: ["'none'"], frameAncestors: ["'self'"], upgradeInsecureRequests: null } } : false, crossOriginEmbedderPolicy: false }));
  app.use(express.json({ limit: '64kb' }));
  app.use('/api',(_req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
  app.use('/api',(req,res,next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin;
      const allowed = options.publicUrl ? new URL(options.publicUrl).origin : `${req.protocol}://${req.get('host')}`;
      if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== allowed)) return res.status(403).json({ error: 'Cross-origin writes are not allowed.' });
      const hasBody = (req.headers['content-length'] && req.headers['content-length'] !== '0') || req.headers['transfer-encoding'];
      if (hasBody && !req.is('application/json')) return res.status(415).json({ error: 'Content-Type must be application/json.' });
    }
    next();
  });
  if (options.rateLimits !== false) {
    const limit = (name: string, max: number, windowMs = 60_000) => rateLimit({ windowMs, limit: max, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Please wait and try again.' }, store: new SqliteRateLimitStore(store.db, name) });
    app.use('/api',limit('api',300));
    app.use('/api/auth/login',limit('login',10,15*60_000));
    app.use('/api/auth/register',limit('register',5,15*60_000));
    app.use('/api/auth/reset-password',limit('reset',5,15*60_000));
    app.use(['/api/auth/mfa/enable','/api/auth/mfa/disable','/api/auth/change-password','/api/auth/delete-account'],limit('sensitive',10,15*60_000));
    app.use('/api/comments',limit('comments',20,10*60_000));
    app.use('/api/rag/chat',limit('chat',15));
    app.use('/api/analytics/track',limit('analytics',60));
  }
  const user = (req: Request): User | null => { const token = sessionToken(req); return token ? store.getUserByToken(token) : null; };
  const admin = (req: Request,res: Response,next: NextFunction) => { const u = user(req); if (!u) return res.status(401).json({ error: 'Sign in required.' }); if (u.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' }); next(); };
  const cookie = (res: Response,token: string,maxAge = 7*86400) => res.cookie(cookieName,token,{ httpOnly: true, sameSite: 'strict', secure: options.production && options.cookieSecure !== false, path: '/', maxAge: maxAge*1000 });
  const validId = (value: string,res: Response) => { const parsed = id.safeParse(value); if (!parsed.success) { res.status(400).json({ error: 'Invalid numeric ID.' }); return null; } return parsed.data; };
  const scraper = options.scraper || new ScraperService(store);

  app.get('/health',(_req,res) => { store.db.prepare('SELECT 1').get(); res.json({ status: 'healthy', service: 'OpenCast', storage: 'sqlite', version: '2.2.0' }); });
  app.get('/api/config',(_req,res) => res.json({ registration: true, scraperConfigured: options.scraperEnabled === true, redditConfigured: options.redditEnabled === true, analyticsRetentionDays: store.retentionDays, privacyContact: options.privacyContact || null, operatorName: options.operatorName || null }));
  app.get('/api/devices',(req,res) => { const ecosystem = z.string().max(40).optional().parse(req.query.ecosystem); res.json(store.getDevices(ecosystem)); });
  app.get('/api/devices/:id',(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; const d = store.getDeviceById(parsed); if (!d) return res.status(404).json({ error: 'Device not found.' }); res.json(d); });
  app.get('/api/issues',(req,res) => {
    const query = z.object({ device_id: id.optional(), severity: z.enum(['all','low','medium','high','critical']).optional(), search: z.string().max(200).optional() }).parse(req.query);
    res.json(store.getIssues(query));
  });
  app.get('/api/issues/:id',(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; const issue = store.getIssueById(parsed); if (!issue) return res.status(404).json({ error: 'Issue not found.' }); res.json(issue); });
  app.get('/api/issues/:id/related',(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; if (!store.getIssueById(parsed)) return res.status(404).json({ error: 'Issue not found.' }); res.json(store.getRelatedIssues(parsed)); });
  app.post('/api/comments/challenge',(req,res) => { const { page_slug } = z.object({ page_slug: slug }).strict().parse(req.body); const target = store.getIssueById(Number(page_slug.split('-')[1])); if (!target) return res.status(404).json({ error: 'Discussion target not found.' }); res.json(store.createChallenge(page_slug)); });
  app.post('/api/comments',(req,res) => { const data = commentSchema.parse(req.body); if (!store.getIssueById(Number(data.page_slug.split('-')[1]))) return res.status(404).json({ error: 'Discussion target not found.' }); try { res.status(201).json({ status: 'success', comment: store.addComment(data,user(req)) }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.get('/api/comments/:slug',(req,res) => { const pageSlug = slug.parse(req.params.slug); const comments = store.getComments(pageSlug); res.json({ page_slug: pageSlug, count: comments.length, comments }); });
  app.post('/api/auth/register',(req,res) => { const data = registerSchema.parse(req.body); try { const result = store.registerUser(data.username,data.email,data.password); cookie(res,result.token); res.status(201).json({ user: result.user }); } catch (e: any) { if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Username or email is already registered.' }); throw e; } });
  app.post('/api/auth/login',(req,res) => { const data = z.object({ username_or_email: z.string().trim().min(3).max(254), password: z.string().min(1).max(128), mfa_code: z.string().trim().min(6).max(20).optional() }).strict().parse(req.body); try { const previous = sessionToken(req); if (previous) store.logoutUser(previous); const result = store.loginUser(data.username_or_email,data.password,data.mfa_code); cookie(res,result.token); res.json({ user: result.user }); } catch (e: any) { if (e.code === 'MFA_REQUIRED') return res.status(401).json({ error: 'Authenticator code required.', mfa_required: true }); res.status(401).json({ error: 'Invalid username/email or password.' }); } });
  const authenticated = (req: Request,res: Response,next: NextFunction) => { const u = user(req); if (!u) return res.status(401).json({ error: 'Sign in required.' }); res.locals.user = u; next(); };
  app.post('/api/auth/mfa/setup',authenticated,(_req,res) => { try { res.json(store.beginMfa((res.locals.user as User).id)); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/auth/mfa/enable',authenticated,(req,res) => { const data = z.object({ code: z.string().trim().regex(/^\d{6}$/) }).strict().parse(req.body); try { res.json(store.enableMfa((res.locals.user as User).id,data.code)); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/auth/mfa/disable',authenticated,(req,res) => { const data = z.object({ password: z.string().min(1).max(128), code: z.string().trim().min(6).max(20) }).strict().parse(req.body); try { store.disableMfa((res.locals.user as User).id,data.password,data.code); res.json({ status: 'disabled' }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/auth/change-password',authenticated,(req,res) => { const data = z.object({ current_password: z.string().min(1).max(128), new_password: z.string().min(10).max(128) }).strict().parse(req.body); try { store.changePassword((res.locals.user as User).id,data.current_password,data.new_password); cookie(res,'',0); res.json({ status: 'password_changed' }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/auth/reset-password',(req,res) => { const data = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), new_password: z.string().min(10).max(128) }).strict().parse(req.body); try { store.resetPassword(data.token,data.new_password); res.json({ status: 'password_reset' }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/auth/delete-account',authenticated,(req,res) => { const data = z.object({ password: z.string().min(1).max(128), mfa_code: z.string().trim().min(6).max(20).optional() }).strict().parse(req.body); try { store.deleteAccount((res.locals.user as User).id,data.password,data.mfa_code); cookie(res,'',0); res.json({ status: 'account_deleted' }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.get('/api/admin/users',admin,(_req,res) => res.json(store.listUsers()));
  app.post('/api/admin/users/:id/reset-token',admin,(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; try { res.json(store.createPasswordResetToken(parsed)); } catch (e) { res.status(404).json({ error: (e as Error).message }); } });
  app.delete('/api/comments/:id',authenticated,(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; try { store.deleteComment(parsed,res.locals.user as User); res.json({ status: 'deleted' }); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/issues/:id/review',admin,(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; const data = z.object({ review_status: z.enum(['reference','unreviewed']) }).strict().parse(req.body); try { store.reviewIssue(parsed,data.review_status); res.json({ status: 'updated' }); } catch (e) { res.status(404).json({ error: (e as Error).message }); } });
  app.delete('/api/issues/:id',admin,(req,res) => { const parsed = validId(req.params.id,res); if (!parsed) return; try { store.deleteIssue(parsed); res.json({ status: 'deleted' }); } catch (e) { res.status(404).json({ error: (e as Error).message }); } });
  app.post('/api/auth/logout',(req,res) => { store.logoutUser(sessionToken(req)); cookie(res,'',0); res.json({ status: 'logged_out' }); });
  app.get('/api/auth/me',(req,res) => { const u = user(req); if (!u) return res.status(401).json({ error: 'Not authenticated.' }); res.json({ authenticated: true, user: u }); });
  app.post('/api/analytics/track',(req,res) => {
    const data = z.object({ page: z.string().max(500), ref: z.string().max(2000).optional(), consent: z.literal(true) }).strict().parse(req.body);
    let page = '/'; let ref = 'Direct';
    try { const url = new URL(data.page,'https://opencast.invalid'); if (url.protocol === 'https:' || url.protocol === 'http:') page = url.pathname.slice(0,200); } catch { /* discard malformed input */ }
    try { if (data.ref && /^https?:\/\//.test(data.ref)) ref = new URL(data.ref).origin; } catch { /* discard malformed referrer */ }
    const result = store.trackEvent(page,ref,String(req.headers['user-agent'] || '').slice(0,500),req.ip || 'unknown');
    res.json({ status: 'recorded', ...result });
  });
  app.get('/api/analytics/stats',(_req,res) => res.json(store.getStats()));
  app.get('/api/shortcodes',(_req,res) => res.json(store.getShortcodes()));
  app.get('/api/shortcodes/:code',(req,res) => { const code = z.string().regex(/^\d{5}$/).parse(req.params.code); const result = store.resolveShortcode(code); if (!result) return res.status(404).json({ error: 'Shortcode not found.' }); res.json(result); });
  app.get('/s/:code',(req,res) => { const code = z.string().regex(/^\d{5}$/).parse(req.params.code); const result = store.resolveShortcode(code); if (!result) return res.status(404).json({ error: 'Shortcode not found.' }); res.setHeader('Referrer-Policy','no-referrer'); res.redirect(302,result.targetUrl); });
  app.post('/api/shortcodes',admin,(req,res) => { const data = z.object({ appName: z.string().trim().min(2).max(100), targetUrl: z.string().url().max(2000), sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(), version: z.string().max(40).default('1.0.0') }).strict().parse(req.body); try { res.status(201).json(store.generateShortcode(data.appName,data.targetUrl,data.sha256,data.version)); } catch (e) { res.status(400).json({ error: (e as Error).message }); } });
  app.post('/api/scrapers/run',admin,async (_req,res,next) => { try { if (options.scraperEnabled !== true) return res.status(503).json({ error: 'Scrapers are disabled. Enable ENABLE_SCRAPERS on the server to enable configured public feeds.' }); if (scraper.busy) return res.status(409).json({ error: 'A run is already in progress.' }); const results = await scraper.run(options.youtubeChannels || [], options.redditEnabled === true); res.json({ status: results.some(r => r.status === 'error') ? 'completed_with_errors' : results.some(r => r.status === 'cooldown') ? 'completed_with_cooldowns' : results.some(r => r.status === 'skipped') ? 'completed_with_skips' : 'success', results, newly_ingested: results.reduce((n,r) => n+r.ingested,0) }); } catch (e) { next(e); } });
  app.get('/api/scrapers/status',admin,(_req,res) => { const last = store.setting('last_scraper_run'); res.json({ running: scraper.busy, last_run: last ? JSON.parse(last) : null }); });
  app.get('/api/rag/export',(_req,res) => res.json(buildRagExport(store)));
  app.post('/api/rag/chat',async (req,res,next) => { try { const data = chatSchema.parse(req.body); res.json(await handleRagChat(data.message,data.history,store)); } catch (e) { next(e); } });
  app.use('/api',(_req,res) => res.status(404).json({ error: 'API endpoint not found.' }));
  app.use((error: any,_req: Request,res: Response,_next: NextFunction) => {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request.', details: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
    if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'Invalid JSON.' });
    console.error('Request failed:',error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'The request could not be completed.' });
  });
  return app;
}
