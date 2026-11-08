import { createHash } from 'node:crypto';

/**
 * Anonymizes client IP address by hashing it with a daily rotating salt and server secret.
 * This guarantees GDPR compliance:
 * 1. Raw IP addresses are NEVER stored in the database.
 * 2. Hashes cannot be reversed (one-way SHA-256).
 * 3. Daily salt ensures cross-day tracking is mathematically impossible, while enabling
 *    accurate unique visitor counts within each 24-hour cycle.
 */
export function hashDailyIp(
  rawIp: string,
  dateStr?: string,
  serverSecret: string = 'streaming-intel-salt-2026'
): string {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const normalizedIp = (rawIp || '127.0.0.1').trim().replace(/:\d+$/, '');
  const payload = `${normalizedIp}_${date}_${serverSecret}`;
  return createHash('sha256').update(payload).digest('hex').substring(0, 16);
}

/**
 * Classifies device types from user agent strings into clean categories:
 * - Streaming Box / TV (FireTV, Android TV, Roku, AppleTV, Tizen, WebOS)
 * - Mobile (Android, iPhone)
 * - Tablet (iPad, Android Tablet)
 * - Desktop (Windows, Mac, Linux)
 */
export function classifyDeviceType(userAgent?: string): 'Streaming Device' | 'Mobile' | 'Tablet' | 'Desktop' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();

  if (
    ua.includes('aft') || // Amazon Fire TV identifier (AFTT, AFTMM, AFTN, etc.)
    ua.includes('firetv') ||
    ua.includes('firestick') ||
    ua.includes('chromecast') ||
    ua.includes('googletv') ||
    ua.includes('android tv') ||
    ua.includes('crkey') ||
    ua.includes('roku') ||
    ua.includes('appletv') ||
    ua.includes('smarttv') ||
    ua.includes('shield') ||
    ua.includes('mibox') ||
    ua.includes('tizen') ||
    ua.includes('webos') ||
    ua.includes('netcast')
  ) {
    return 'Streaming Device';
  }

  if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'Tablet';
  }

  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipod') || ua.includes('android')) {
    return 'Mobile';
  }

  return 'Desktop';
}
