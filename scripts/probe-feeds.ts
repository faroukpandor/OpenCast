import { StreamingStore } from '../src/server/db.ts';
import { ScraperService } from '../src/server/scraper_service.ts';

// Live network probe for CI/manual operation. Uses an isolated in-memory database.
const channels=(process.env.YOUTUBE_CHANNEL_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
const redditApproved=process.env.REDDIT_ACCESS_APPROVED === 'true';
if (!channels.length) { console.error('Set YOUTUBE_CHANNEL_IDS to at least one public channel.'); process.exit(1); }
const store=new StreamingStore();
try {
  const results=await new ScraperService(store).run(channels,redditApproved);
  const report={ at:new Date().toISOString(), results, issues_in_isolated_store:store.getIssues().filter(i => i.review_status==='unreviewed').length };
  console.log(JSON.stringify(report,null,2));
  const failed=!results.some(r => r.source.startsWith('YouTube') && r.status==='ok') || results.some(r => r.status==='error');
  // GitHub exposes these annotations through the Checks API even when raw log storage is unreachable.
  console.log(`::${failed ? 'error' : 'notice'} title=Live feed probe result::${JSON.stringify(report)}`);
  if (failed) process.exitCode=1;
} finally { store.close(); }
