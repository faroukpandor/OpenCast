import { StreamingStore } from '../src/server/db.ts';
import { ScraperService } from '../src/server/scraper_service.ts';

// Live network probe for CI/manual operation. Uses an isolated in-memory database.
const channels=(process.env.YOUTUBE_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const redditApproved=process.env.REDDIT_ACCESS_APPROVED === 'true';
if (!channels.length) { console.error('Set YOUTUBE_CHANNEL_IDS to at least one public channel.'); process.exit(1); }
const store=new StreamingStore();
try {
  const results=await new ScraperService(store).run(channels,redditApproved);
  console.log(JSON.stringify({ at:new Date().toISOString(), results, issues_in_isolated_store:store.getIssues().filter(i => i.review_status==='unreviewed').length },null,2));
  if (!results.some(r => r.source.startsWith('YouTube') && r.status==='ok') || results.some(r => r.status==='error')) process.exitCode=1;
} finally { store.close(); }
