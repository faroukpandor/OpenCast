import { z } from 'zod';

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === 'production';
  const port = z.coerce.number().int().min(1).max(65535).parse(env.PORT || 3000);
  const trustProxyHops = z.coerce.number().int().min(0).max(5).parse(env.TRUST_PROXY_HOPS || 0);
  const cookieSecure = z.enum(['true','false']).parse(env.COOKIE_SECURE || (production ? 'true' : 'false')) === 'true';
  const scraperEnabled = z.enum(['true','false']).parse(env.ENABLE_SCRAPERS || 'false') === 'true';
  let publicUrl: string | undefined;
  if (env.APP_URL) {
    const url = z.url().parse(env.APP_URL);
    const parsed = new URL(url);
    if (!['https:','http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) throw new Error('APP_URL must be an HTTP(S) origin without credentials, path, query, or fragment.');
    if (production && cookieSecure && parsed.protocol !== 'https:') throw new Error('HTTPS APP_URL is required with secure cookies.');
    publicUrl = parsed.origin;
  }
  if (env.ANALYTICS_SECRET && env.ANALYTICS_SECRET.length < 32) throw new Error('ANALYTICS_SECRET must contain at least 32 characters.');
  const anyAdmin = !!(env.ADMIN_USERNAME || env.ADMIN_EMAIL || env.ADMIN_PASSWORD);
  const allAdmin = !!(env.ADMIN_USERNAME && env.ADMIN_EMAIL && env.ADMIN_PASSWORD);
  if (anyAdmin && !allAdmin) throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD together.');
  const admin = allAdmin ? {
    username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/).parse(env.ADMIN_USERNAME),
    email: z.email().max(254).transform(s => s.toLowerCase()).parse(env.ADMIN_EMAIL),
    password: z.string().min(12).max(128).parse(env.ADMIN_PASSWORD)
  } : undefined;
  const youtubeChannels = (env.YOUTUBE_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (youtubeChannels.length > 5 || youtubeChannels.some(id => !/^UC[A-Za-z0-9_-]{22}$/.test(id))) throw new Error('Configure at most five valid YouTube channel IDs (UC followed by 22 characters).');
  const databasePath = z.string().min(1).parse(env.DATABASE_PATH || 'data/opencast.sqlite');
  return { production, port, trustProxyHops, cookieSecure, scraperEnabled, publicUrl, admin, youtubeChannels, databasePath, analyticsSecret: env.ANALYTICS_SECRET };
}
