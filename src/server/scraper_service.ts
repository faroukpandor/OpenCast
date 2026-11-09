import { XMLParser } from 'fast-xml-parser';
import type { StreamingStore } from './db.ts';

export interface ScraperResult { source: string; status: 'ok' | 'error' | 'cooldown' | 'skipped'; ingested: number; message?: string; }
interface SourceState { failures: number; cooldownUntil: number; }
const stripHtml = (text: string) => text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const array = (value: any) => value == null ? [] : Array.isArray(value) ? value : [value];
export class ScraperService {
  private running = false;
  constructor(private store: StreamingStore, private fetcher: typeof fetch = fetch, private now: () => number = Date.now) {}
  get busy() { return this.running; }
  private sourceStates(): Record<string, SourceState> {
    try { return JSON.parse(this.store.setting('scraper_source_state') || '{}') as Record<string, SourceState>; }
    catch { return {}; }
  }
  private inCooldown(states: Record<string, SourceState>, source: string) {
    const state = states[source];
    return !!state && state.cooldownUntil > this.now();
  }
  private recordFailure(states: Record<string, SourceState>, source: string) {
    const failures = (states[source]?.failures || 0) + 1;
    const delay = Math.min(6 * 60 * 60_000, 5 * 60_000 * 2 ** (failures - 1));
    states[source] = { failures, cooldownUntil: this.now() + delay };
  }
  async run(channels: string[] = [], redditApproved = false): Promise<ScraperResult[]> {
    if (this.running) throw new Error('An ingestion run is already in progress.');
    this.running = true;
    const results: ScraperResult[] = [];
    const states = this.sourceStates();
    try {
      for (const [subreddit, deviceId] of [['FireTV',1],['AndroidTV',2]] as const) {
        const source = `r/${subreddit}`;
        if (!redditApproved) { results.push({ source, status: 'skipped', ingested: 0, message: 'Reddit access is not approved. Obtain Reddit permission, then set REDDIT_ACCESS_APPROVED=true.' }); continue; }
        if (this.inCooldown(states, source)) { results.push({ source, status: 'cooldown', ingested: 0, message: `Source is cooling down after a failure. Retry after ${new Date(states[source].cooldownUntil).toISOString()}.` }); continue; }
        const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=25&raw_json=1`;
        try {
          const payload = await this.get(url);
          const posts = JSON.parse(payload)?.data?.children;
          if (!Array.isArray(posts)) throw new Error('Invalid Reddit feed.');
          let ingested = 0;
          for (const post of posts.slice(0,25)) {
            const p = post?.data;
            if (!p || typeof p.title !== 'string' || typeof p.permalink !== 'string' || !/^\/r\/[a-zA-Z0-9_]+\/comments\/[a-z0-9]+\//.test(p.permalink)) continue;
            const title = stripHtml(p.title).slice(0,240);
            const description = stripHtml(String(p.selftext || '')).slice(0,2000);
            if (!/adb|sideload|apk|launcher|bootloop|storage|audio|firmware/i.test(`${title} ${description}`)) continue;
            if (this.store.ingestIssue({ device_id: deviceId, title, description: description || 'Community report. Open the source and review before applying any proposed fix.', severity: 'medium', source_url: `https://www.reddit.com${p.permalink}` })) ingested++;
          }
          delete states[source];
          results.push({ source, status: 'ok', ingested });
        } catch (e) { this.recordFailure(states, source); results.push({ source, status: 'error', ingested: 0, message: this.safeError(e) }); }
        await new Promise(r => setTimeout(r,1100));
      }
      for (const channel of channels.filter(c => /^UC[A-Za-z0-9_-]{22}$/.test(c)).slice(0,5)) {
        const source = `YouTube ${channel}`;
        if (this.inCooldown(states, source)) { results.push({ source, status: 'cooldown', ingested: 0, message: `Source is cooling down after a failure. Retry after ${new Date(states[source].cooldownUntil).toISOString()}.` }); continue; }
        const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`;
        try {
          const xml = await this.get(url);
          const parsed = new XMLParser({ ignoreAttributes: false, processEntities: true, htmlEntities: true }).parse(xml);
          let ingested = 0;
          for (const entry of array(parsed?.feed?.entry).slice(0,25)) {
            const id = entry['yt:videoId']; const title = stripHtml(String(entry.title || '')).slice(0,240);
            if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(id) || !title) continue;
            const description = stripHtml(String(entry['media:group']?.['media:description'] || '')).slice(0,2000);
            if (!/adb|sideload|apk|launcher|bootloop|storage|audio|fire tv|google tv|roku/i.test(`${title} ${description}`)) continue;
            const deviceId = /roku/i.test(title) ? 8 : /google tv|chromecast/i.test(title) ? 2 : 1;
            if (this.store.ingestIssue({ device_id: deviceId, title, description: description || 'Video report. Review the source before treating it as a troubleshooting guide.', severity: 'medium', source_url: `https://www.youtube.com/watch?v=${id}` })) ingested++;
          }
          delete states[source];
          results.push({ source, status: 'ok', ingested });
        } catch (e) { this.recordFailure(states, source); results.push({ source, status: 'error', ingested: 0, message: this.safeError(e) }); }
        await new Promise(r => setTimeout(r,1100));
      }
      this.store.setSetting('scraper_source_state',JSON.stringify(states));
      this.store.setSetting('last_scraper_run',JSON.stringify({ at: new Date(this.now()).toISOString(), results }));
      return results;
    } finally { this.running = false; }
  }
  private safeError(e: unknown) { return e instanceof Error && e.name === 'TimeoutError' ? 'Source timed out.' : 'Source unavailable or returned an invalid response.'; }
  private async get(url: string) {
    const response = await this.fetcher(url, { signal: AbortSignal.timeout(12_000), redirect: 'error', headers: { 'User-Agent': 'OpenCast/2.2 (self-hosted feed reader)', Accept: 'application/json, application/atom+xml, application/xml' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (Number(response.headers.get('content-length')) > 2_000_000) throw new Error('Feed too large.');
    const reader = response.body?.getReader(); if (!reader) throw new Error('Empty response.');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) { await reader.cancel(); throw new Error('Feed too large.'); } chunks.push(value); }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }
}
