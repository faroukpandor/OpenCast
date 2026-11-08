import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import request from 'supertest';
import { StreamingStore } from '../src/server/db.ts';
import { createApi } from '../src/server/app.ts';
import { mineProofOfWork } from '../src/utils/crypto_pow.ts';
import { ScraperService } from '../src/server/scraper_service.ts';

function setup(t: any) { const store=new StreamingStore(); const app=createApi(store,{ rateLimits:false }); t.after(() => store.close()); return { store,app }; }
test('API validates IDs and query filters and returns real empty analytics',async t => {
  const { app }=setup(t); await request(app).get('/health').expect(200); await request(app).get('/api/devices/NaN').expect(400); await request(app).get('/api/issues/999999').expect(404);
  const devices=await request(app).get('/api/devices?ecosystem=Amazon').expect(200); assert.ok(devices.body.length>0); assert.ok(devices.body.every((d: any) => d.ecosystem==='Amazon'));
  const issues=await request(app).get('/api/issues?device_id=1&severity=high').expect(200); assert.ok(issues.body.every((i: any) => i.device_id===1 && i.severity==='high'));
  const stats=await request(app).get('/api/analytics/stats').expect(200); assert.equal(stats.body.total_views,0); assert.equal(stats.body.unique_visitors_today,0);
  await request(app).get('/api/no-such-endpoint').expect(404);
});
test('cookie sessions, authorship integrity, challenge replay, and admin boundaries',async t => {
  const { app,store }=setup(t); const agent=request.agent(app);
  const registration=await agent.post('/api/auth/register').send({ username:'api_user',email:'API@example.com',password:'long-test-password' }).expect(201);
  assert.equal(registration.body.token,undefined); assert.match(registration.headers['set-cookie'][0],/HttpOnly/); assert.match(registration.headers['set-cookie'][0],/SameSite=Strict/);
  await agent.get('/api/auth/me').expect(200); await agent.post('/api/shortcodes').send({ appName:'Unauthorized',targetUrl:'https://example.com' }).expect(403);
  await agent.post('/api/auth/register').send({ username:'x',email:'no',password:'x' }).expect(400);
  const c=await agent.post('/api/comments/challenge').send({ page_slug:'issue-1' }).expect(200); const content='Exact content that was mined'; const pow=await mineProofOfWork(c.body.challenge,'issue-1',content,'0000');
  const payload={ page_slug:'issue-1',content,nonce:pow.nonce,challenge:c.body.challenge,client_id:randomUUID() };
  const posted=await agent.post('/api/comments').send({ ...payload,user_id:999 }).expect(400); assert.match(posted.body.error,/Invalid request/);
  await agent.post('/api/comments').send(payload).expect(201); await agent.post('/api/comments').send({ ...payload,nonce:'invalid-but-idempotent-retry' }).expect(201); assert.equal(store.getComments('issue-1').length,1); const replay=await agent.post('/api/comments').send({ ...payload,client_id:randomUUID() }); assert.equal(replay.status,400);
  assert.equal(store.getComments('issue-1')[0].author_name,'api_user');
  await agent.post('/api/comments').send({ ...payload,content:' Tampered content ' }).expect(400);
  await agent.post('/api/auth/logout').send({}).expect(200); await agent.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({ username_or_email:'api_user',password:'wrong' }).expect(401);
});
test('CSRF origin defense, content type, consent, minimized analytics, and malformed JSON',async t => {
  const { app,store }=setup(t);
  await request(app).post('/api/analytics/track').set('Origin','https://evil.example').send({ page:'/',consent:true }).expect(403);
  await request(app).post('/api/analytics/track').type('form').send({ page:'/' }).expect(415);
  await request(app).post('/api/analytics/track').send({ page:'/' }).expect(400);
  await request(app).post('/api/analytics/track').send({ page:'/secret?token=abcd#fragment',ref:'https://example.com/private?email=a@b.com',consent:true,ua:'forged' }).expect(400);
  const tracked=await request(app).post('/api/analytics/track').set('X-Forwarded-For','203.0.113.99').send({ page:'/secret?token=abcd#fragment',ref:'https://example.com/private?email=a@b.com',consent:true }).expect(200);
  assert.equal(tracked.body.daily_visitor_token,undefined); const row=store.db.prepare('SELECT * FROM analytics_events').get() as any; assert.equal(row.page_url,'/secret'); assert.equal(row.referrer,'https://example.com'); assert.ok(!JSON.stringify(row).includes('203.0.113'));
  await request(app).post('/api/auth/login').set('Content-Type','application/json').send('{"bad":').expect(400);
});
test('shortcodes persist and redirect only to stored HTTPS locations',async t => {
  const { app,store }=setup(t); store.ensureAdmin({ username:'admin',email:'admin@example.com',password:'administrator-password' }); const agent=request.agent(app);
  await agent.post('/api/auth/login').send({ username_or_email:'admin',password:'administrator-password' }).expect(200);
  await agent.post('/api/shortcodes').send({ appName:'Bad link',targetUrl:'javascript:alert(1)' }).expect(400);
  const created=await agent.post('/api/shortcodes').send({ appName:'Upstream app',targetUrl:'https://example.com/release.apk' }).expect(201);
  await request(app).get(`/api/shortcodes/${created.body.code}`).expect(200); const redirect=await request(app).get(`/s/${created.body.code}`).expect(302); assert.equal(redirect.headers.location,'https://example.com/release.apk');
  await request(app).get('/s/99999').expect(404);
});
test('RAG endpoint works without API keys and exports omit private data',async t => {
  const { app }=setup(t); 
  const result=await request(app).post('/api/rag/chat').send({ message:'FireOS verification',history:[] }).expect(200); assert.equal(result.body.isAiGenerated,false); assert.ok(result.body.sources.length);
  await request(app).post('/api/rag/chat').send({ message:'x'.repeat(2001) }).expect(400);
  const exported=await request(app).get('/api/rag/export').expect(200); assert.ok(exported.body.schema_org['@graph'].length); assert.ok(!JSON.stringify(exported.body).includes('hashed_password'));
});
test('scraper requires admin and explicit enablement, reports source failures honestly',async t => {
  const { store }=setup(t); const scraper=new ScraperService(store,async () => new Response(JSON.stringify({ data:{ children:[] } }),{ headers:{ 'Content-Type':'application/json' } }));
  let scraperEnabled=false; const app=createApi(store,{ rateLimits:false,scraper,get scraperEnabled(){ return scraperEnabled; } }); await request(app).post('/api/scrapers/run').send({}).expect(401);
  store.ensureAdmin({ username:'admin',email:'admin@example.com',password:'administrator-password' }); const agent=request.agent(app); await agent.post('/api/auth/login').send({ username_or_email:'admin',password:'administrator-password' });
   await agent.post('/api/scrapers/run').send({}).expect(503);
  scraperEnabled=true; const result=await agent.post('/api/scrapers/run').send({}).expect(200); assert.equal(result.body.newly_ingested,0); assert.equal(result.body.results.length,2); assert.ok(result.body.results.every((r: any) => r.status==='ok'));
});
test('configuration rejects weak/incomplete admin settings before database creation',async () => {
  const { readConfig }=await import('../src/server/config.ts');
  assert.throws(() => readConfig({ ADMIN_PASSWORD:'short' }),/together/);
  assert.throws(() => readConfig({ ADMIN_USERNAME:'admin',ADMIN_EMAIL:'a@example.com',ADMIN_PASSWORD:'short' }),/Too small/);
  assert.throws(() => readConfig({ PORT:'70000' }),/Too big/);
  assert.throws(() => readConfig({ APP_URL:'https://example.com/path' }),/origin/);
  assert.throws(() => readConfig({ TRUST_PROXY_HOPS:'-1' }),/Too small/);
  assert.equal(readConfig({ NODE_ENV:'production' }).cookieSecure,true);
  assert.equal(readConfig({ NODE_ENV:'production',COOKIE_SECURE:'false' }).cookieSecure,false);
});
test('secure production cookies and same-origin configuration are enforced',async t => {
  const { store }=setup(t); const app=createApi(store,{ production:true,cookieSecure:true,publicUrl:'https://cast.example.com',rateLimits:false });
  const result=await request(app).post('/api/auth/register').set('Origin','https://cast.example.com').send({ username:'secure_user',email:'secure@example.com',password:'long-test-password' }).expect(201);
  assert.match(result.headers['set-cookie'][0],/Secure/);
  await request(app).post('/api/auth/logout').set('Origin','https://other.example.com').send({}).expect(403);
});
test('offline retry with a fresh challenge cannot duplicate a submitted report',async t => {
  const { app,store }=setup(t); const content='One report even when the response is lost'; const client_id=randomUUID();
  for(let i=0;i<2;i++) { const c=await request(app).post('/api/comments/challenge').send({ page_slug:'issue-1' }).expect(200); const pow=await mineProofOfWork(c.body.challenge,'issue-1',content,'0000'); await request(app).post('/api/comments').send({ page_slug:'issue-1',content,client_id,challenge:c.body.challenge,nonce:pow.nonce }).expect(201); }
  assert.equal(store.getComments('issue-1').length,1);
});
test('scraper surfaces unavailable and malformed sources without inventing reports',async t => {
  const { store }=setup(t); let call=0;
  const scraper=new ScraperService(store,async () => { call++; return call===1 ? new Response('blocked',{ status:403 }) : new Response('not json'); });
  const results=await scraper.run(); assert.equal(results.length,2); assert.ok(results.every(r => r.status==='error' && r.ingested===0)); assert.equal(store.getIssues().filter(i => i.review_status==='unreviewed').length,0);
  assert.match(JSON.parse(store.setting('last_scraper_run')!).results[0].message,/unavailable/);
});

test('scraper cooldown persists, skips failing sources, and resets after a later success',async t => {
  const { store }=setup(t); let now=1_000_000; let calls=0; let fail=true;
  const scraper=new ScraperService(store,async () => { calls++; return fail ? new Response('blocked',{ status:403 }) : new Response(JSON.stringify({ data:{ children:[] } })); },() => now);
  const first=await scraper.run(); assert.ok(first.every(r => r.status==='error')); assert.equal(calls,2);
  const second=await scraper.run(); assert.ok(second.every(r => r.status==='cooldown' && r.ingested===0)); assert.equal(calls,2);
  now += 5*60_000+1; fail=false; const third=await scraper.run(); assert.ok(third.every(r => r.status==='ok')); assert.equal(calls,4);
  const fourth=await scraper.run(); assert.ok(fourth.every(r => r.status==='ok')); assert.equal(calls,6);
});

test('catalog knowledge graph exports only explicit relationships and omits private data',async t => {
  const { app,store }=setup(t); store.ingestIssue({ device_id:1,title:'Community report',description:'Unreviewed',severity:'medium',source_url:'https://example.com/report' });
  const exported=await request(app).get('/api/rag/export').expect(200); const graph=exported.body.knowledge_graph;
  assert.equal(graph.version,1); assert.ok(graph.nodes.length>0); assert.ok(graph.edges.length>0); assert.ok(graph.edges.every((e: any) => e.evidence==='extracted'));
  const ids=new Set(graph.nodes.map((n: any) => n.id)); assert.ok(graph.edges.every((e: any) => ids.has(e.from) && ids.has(e.to)));
  assert.ok(graph.nodes.some((n: any) => n.type==='issue' && n.review_status==='unreviewed')); assert.ok(!JSON.stringify(graph).includes('hashed_password'));
});
