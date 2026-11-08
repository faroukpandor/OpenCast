import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StreamingStore } from '../src/server/db.ts';
import { seedDevices } from '../src/server/seed.ts';
import { proofOfWorkHash } from '../src/server/crypto.ts';
import { mineProofOfWork,sha256Hex } from '../src/utils/crypto_pow.ts';
import { classifyDeviceType } from '../src/utils/analytics_salt.ts';
import { extractKeywords,findRelatedIssues } from '../src/utils/related_search.ts';
import { generateLocalRagAnswer,buildRagExport } from '../src/server/rag_chat_service.ts';
import { inspectApk,parseBinaryManifest } from '../src/utils/apk_inspector.ts';
import { zipSync,strToU8 } from 'fflate';

function challengeComment(store: StreamingStore,content='A reproducible test report') {
  const c=store.createChallenge('issue-1'); const nonce='fixed-test-nonce';
  // Test-only: use a known valid preimage by choosing a nonce until the real difficulty passes.
  let n=0; while(!proofOfWorkHash(c.challenge,'issue-1',content,String(n)).startsWith('0000')) n++;
  return { page_slug:'issue-1',content,nonce:String(n),challenge:c.challenge,client_id:randomUUID() };
}
test('SHA-256 and proof of work match standard vectors and bind context',async () => {
  assert.equal(await sha256Hex('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const result=await mineProofOfWork('challenge','issue-1','hello','00'); assert.ok(result.hash.startsWith('00'));
  assert.notEqual(proofOfWorkHash('a','issue-1','hello','1'),proofOfWorkHash('b','issue-1','hello','1'));
  await assert.rejects(mineProofOfWork('c','issue-1','hello','00',AbortSignal.abort()));
});
test('SQLite persists users, comments, and links across restarts with no default account',() => {
  const dir=mkdtempSync(join(tmpdir(),'opencast-test-')); const path=join(dir,'test.sqlite');
  let db=new StreamingStore(path); try {
    assert.equal(db.getUserByToken('demo-engineer-token-777'),null); assert.equal(db.getStats().total_views,0);
    const account=db.registerUser('tester','test@example.com','a-long-test-password'); const data=challengeComment(db);
    db.addComment(data,account.user); assert.equal(db.addComment(data,account.user).id,db.getComments('issue-1')[0].id); assert.throws(() => db.addComment({ ...data,client_id:randomUUID() }),/expired or already used/);
    const code=db.generateShortcode('Test app','https://example.com/app.apk'); db.close(); db=new StreamingStore(path);
    assert.equal(db.getUserByToken(account.token)?.username,'tester'); assert.equal(db.getComments('issue-1').length,1); assert.equal(db.resolveShortcode(code.code)?.appName,'Test app');
    db.logoutUser(account.token); assert.equal(db.getUserByToken(account.token),null);
  } finally { db.close(); rmSync(dir,{ recursive:true,force:true }); }
});
test('session expiration, unique identities, salted passwords, and administrator roles',() => {
  const db=new StreamingStore(); try {
    const a=db.registerUser('alice','alice@example.com','password-one-long'); const b=db.registerUser('alice2','alice2@example.com','password-two-long');
    const row=db.db.prepare('SELECT salt,hash FROM users WHERE id=?').get(a.user.id) as any; const other=db.db.prepare('SELECT salt,hash FROM users WHERE id=?').get(b.user.id) as any;
    assert.notEqual(row.hash,other.hash); assert.throws(() => db.loginUser('alice','wrong')); assert.ok(db.loginUser('ALICE','password-one-long').token);
    assert.throws(() => db.registerUser('ALICE','new@example.com','password-three-long'),/UNIQUE/);
    db.db.prepare('UPDATE sessions SET expires_at=0 WHERE user_id=?').run(a.user.id); assert.equal(db.getUserByToken(a.token),null);
    db.ensureAdmin({ username:'admin',email:'admin@example.com',password:'administrator-password' }); assert.equal(db.loginUser('admin','administrator-password').user.role,'admin');
  } finally { db.close(); }
});
test('comment author cannot be supplied by caller and nonce cannot be reused across pages',() => {
  const db=new StreamingStore(); try { const user=db.registerUser('member','m@example.com','long-test-password'); const data=challengeComment(db); const comment=db.addComment(data,user.user); assert.equal(comment.author_name,'member'); assert.throws(() => db.addComment({ ...data,client_id:randomUUID(),page_slug:'issue-2',challenge:db.createChallenge('issue-2').challenge }),/proof of work/); } finally { db.close(); }
});
test('analytics stores daily token, actual unique counts, no query PII, and expires old events',() => {
  const db=new StreamingStore(); try {
    const now=new Date('2026-11-08T12:00:00Z'); db.trackEvent('/issues/1','https://example.com','iPhone','198.51.100.1',now); db.trackEvent('/issues/1','Direct','iPhone','198.51.100.1',now); db.trackEvent('/','Direct','Desktop','198.51.100.2',now);
    const stats=db.getStats(now); assert.equal(stats.total_views,3); assert.equal(stats.unique_visitors_today,2);
    const row=db.db.prepare('SELECT * FROM analytics_events LIMIT 1').get() as any; assert.equal(row.daily_visitor_token.length,32); assert.ok(!JSON.stringify(row).includes('198.51'));
    db.trackEvent('/old','Direct','Desktop','198.51.100.3',new Date('2026-09-01')); db.maintenance(+now); assert.equal(db.getStats(now).total_views,3);
  } finally { db.close(); }
});
test('device classification, keywords, relatedness, and local grounded search',() => {
  assert.equal(classifyDeviceType('Mozilla AFTMM FireTV'),'Streaming Device'); assert.equal(classifyDeviceType('iPhone Mobile'),'Mobile'); assert.equal(classifyDeviceType('Macintosh'),'Desktop');
  assert.ok(extractKeywords('ADB ADB fireos fireos').includes('adb')); assert.equal(extractKeywords('ADB ADB').length,1);
  const db=new StreamingStore(); try { const related=db.getRelatedIssues(1); assert.ok(related.length<=5); assert.ok(related.every(i => i.id!==1)); assert.equal(db.getIssueById(9999),null); assert.ok(generateLocalRagAnswer('FireOS verification',db).answer.includes('verification')); assert.match(generateLocalRagAnswer('zzzzunknown',db).answer,/No matching/); assert.ok(buildRagExport(db).llm_context_markdown.includes('Shortcode 20002')); } finally { db.close(); }
});
test('persistent shortcode validation and source deduplication',() => {
  const db=new StreamingStore(); try { assert.throws(() => db.generateShortcode('Bad','http://example.com'),/HTTPS/); assert.throws(() => db.generateShortcode('Bad','https://user:pass@example.com'),/credentials/); const data={ device_id:1,title:'Report',description:'Source report',severity:'medium' as const,source_url:'https://example.com/report' }; assert.equal(db.ingestIssue(data),true); assert.equal(db.ingestIssue(data),false); assert.equal(db.getIssues({ search:'Source report' })[0].review_status,'unreviewed'); } finally { db.close(); }
});
// Small valid binary XML fixture with one UTF-8 string pool and manifest start element.
function manifestFixture() {
  const strings=['manifest','package','org.test.app']; const offsets:number[]=[]; const data:number[]=[];
  for(const s of strings) { offsets.push(data.length); const b=Buffer.from(s); data.push(b.length,b.length,...b,0); } while(data.length%4) data.push(0);
  const header=Buffer.alloc(28); header.writeUInt16LE(1,0); header.writeUInt16LE(28,2); header.writeUInt32LE(28+strings.length*4+data.length,4); header.writeUInt32LE(strings.length,8); header.writeUInt32LE(0x100,16); header.writeUInt32LE(28+strings.length*4,20);
  const element=Buffer.alloc(56); element.writeUInt16LE(0x102,0); element.writeUInt16LE(16,2); element.writeUInt32LE(56,4);
  element.writeUInt32LE(0,20); element.writeUInt16LE(20,24); element.writeUInt16LE(20,26); element.writeUInt16LE(1,28);
  element.writeUInt32LE(0,36); element.writeUInt32LE(1,40); element.writeUInt32LE(2,44); element[51]=3; element.writeUInt32LE(2,52);
  while(data.length%4) data.push(0); const pool=Buffer.concat([header,...offsets.map(o => { const b=Buffer.alloc(4); b.writeUInt32LE(o); return b; }),Buffer.from(data)]); const body=Buffer.concat([pool,element]); const file=Buffer.alloc(8+body.length); file.writeUInt16LE(3,0); file.writeUInt16LE(8,2); file.writeUInt32LE(file.length,4); body.copy(file,8); return new Uint8Array(file);
}
test('APK inspector hashes actual bytes and parses ZIP binary manifest without safe-list fakery',async () => {
  const manifest=manifestFixture(); assert.equal(parseBinaryManifest(manifest).packageName,'org.test.app');
  const apk=new File([zipSync({ 'AndroidManifest.xml':manifest }) as BlobPart],'test.apk'); const report=await inspectApk(apk);
  assert.equal(report.manifestParsed,true); assert.equal(report.packageName,'org.test.app'); assert.equal(report.checksumMatch,null); assert.equal(report.computedSha256,await sha256Hex(new Uint8Array(await apk.arrayBuffer())));
  assert.equal((await inspectApk(apk,report.computedSha256)).checksumMatch,true); assert.equal((await inspectApk(apk,'0'.repeat(64))).checksumMatch,false);
  const invalid=await inspectApk(new File(['bad'],'bad.apk')); assert.equal(invalid.manifestParsed,false); assert.ok(invalid.flags.some(f => f.includes('valid Android manifest'))); await assert.rejects(inspectApk(new File(['bad'],'bad.txt')));
});
test('APK UTF-16 extended string lengths decode high-bit character counts',() => {
  const value='x'.repeat(32768)+'σ'; const encoded=Buffer.from(value,'utf16le');
  const prefix=Buffer.alloc(4); prefix.writeUInt16LE(0x8000,0); prefix.writeUInt16LE(value.length,2);
  const names=['manifest','package'].map(s => { const length=Buffer.alloc(2); length.writeUInt16LE(s.length); return Buffer.concat([length,Buffer.from(s,'utf16le'),Buffer.alloc(2)]); });
  const padding=Buffer.alloc((4-(names[0].length+names[1].length)%4)%4);
  const data=Buffer.concat([names[0],names[1],padding,prefix,encoded,Buffer.alloc(4)]);
  const header=Buffer.alloc(40); header.writeUInt16LE(1,0); header.writeUInt16LE(28,2); header.writeUInt32LE(40+data.length,4); header.writeUInt32LE(3,8); header.writeUInt32LE(40,20);
  header.writeUInt32LE(0,28); header.writeUInt32LE(names[0].length,32); header.writeUInt32LE(names[0].length+names[1].length+padding.length,36);
  const element=Buffer.alloc(56); element.writeUInt16LE(0x102,0); element.writeUInt16LE(16,2); element.writeUInt32LE(56,4); element.writeUInt32LE(0,20); element.writeUInt16LE(20,24); element.writeUInt16LE(20,26); element.writeUInt16LE(1,28); element.writeUInt32LE(1,40); element.writeUInt32LE(2,44); element[51]=3; element.writeUInt32LE(2,52);
  const body=Buffer.concat([header,data,element]); const manifest=Buffer.alloc(8+body.length); manifest.writeUInt16LE(3,0); manifest.writeUInt16LE(8,2); manifest.writeUInt32LE(manifest.length,4); body.copy(manifest,8);
  assert.equal(parseBinaryManifest(new Uint8Array(manifest)).packageName,value);
  assert.throws(() => parseBinaryManifest(new Uint8Array(manifest.subarray(0,manifest.length-10))),/Invalid manifest chunk/);
});
test('offline outbox preserves rejected drafts and deduplicates enqueue IDs',async () => {
  const values=new Map<string,string>(); const target=new EventTarget();
  Object.defineProperty(globalThis,'localStorage',{ configurable:true,value:{ getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v) } });
  Object.defineProperty(globalThis,'window',{ configurable:true,value:target });
  try {
    const { outboxManager }=await import('../src/utils/outbox_queue.ts'); const id=randomUUID(); const item={ page_slug:'issue-1',content:'A queued draft' };
    outboxManager.enqueue(item,id); outboxManager.enqueue(item,id); assert.equal(outboxManager.getQueue().length,1);
    const rejected=await outboxManager.flush(async () => { throw Object.assign(new Error('Rejected'),{ status:400 }); });
    assert.equal(rejected.remaining,1); assert.match(outboxManager.getQueue()[0].error||'',/Rejected/);
    let calls=0; await outboxManager.flush(async () => { calls++; }); assert.equal(calls,0);
    outboxManager.remove(id); assert.equal(outboxManager.getQueue().length,0);
  } finally { Reflect.deleteProperty(globalThis,'localStorage'); Reflect.deleteProperty(globalThis,'window'); }
});

test('legacy comment database migrates nullable submission IDs with a unique index',() => {
  const dir=mkdtempSync(join(tmpdir(),'opencast-migration-')); const path=join(dir,'legacy.sqlite');
  let db=new StreamingStore(path);
  try { db.db.prepare('UPDATE devices SET specs_json=? WHERE id=6').run(JSON.stringify({ ...seedDevices[5].specs,adb_port:9922 })); db.setSetting('reference_safety_v2',''); db.db.exec('DROP TABLE comments; CREATE TABLE comments(id INTEGER PRIMARY KEY, page_slug TEXT NOT NULL, author_hash TEXT NOT NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, content TEXT NOT NULL, proof_of_work_nonce TEXT NOT NULL, created_at TEXT NOT NULL);'); db.close(); db=new StreamingStore(path); assert.equal(db.getDeviceById(6)?.specs.adb_port,0); const data=challengeComment(db); db.addComment(data); assert.equal(db.addComment(data).id,db.getComments('issue-1')[0].id); }
  finally { db.close(); rmSync(dir,{ recursive:true,force:true }); }
});

test('deterministic source security guard flags dangerous patterns and accepts safe code',async () => {
  const { scanSource }=await import('../scripts/security_check.ts');
  assert.equal(scanSource("const x = 1;").length,0);
  assert.ok(scanSource("eval('x')").some(f => f.rule==='dynamic-code'));
  assert.ok(scanSource("el.innerHTML = value;").some(f => f.rule==='unsafe-html'));
  assert.ok(scanSource("const password = 'super-secret-value';").some(f => f.rule==='hardcoded-secret'));
  assert.ok(scanSource("db.prepare(`SELECT * FROM t WHERE id=${id}`)").some(f => f.rule==='sql-interpolation'));
  assert.ok(scanSource("fetch(url,{ rejectUnauthorized: false })").some(f => f.rule==='tls-bypass'));
});

test('SQLite backup is a verified restorable snapshot and refuses overwrite',async () => {
  const dir=mkdtempSync(join(tmpdir(),'opencast-backup-')); const source=join(dir,'live.sqlite'); const destination=join(dir,'backup.sqlite');
  const db=new StreamingStore(source);
  try {
    const account=db.registerUser('backup_user','backup@example.com','a-long-test-password'); const data=challengeComment(db); db.addComment(data,account.user);
    const { backupDatabase }=await import('../src/server/backup.ts');
    backupDatabase(source,destination);
    assert.throws(() => backupDatabase(source,destination),/already exists/);
    assert.throws(() => backupDatabase(source,source),/must differ/);
    const restored=new StreamingStore(destination);
    try { assert.equal(restored.getUserByToken(account.token)?.email,'backup@example.com'); assert.equal(restored.getComments('issue-1')[0].content,data.content); }
    finally { restored.close(); }
  } finally { db.close(); rmSync(dir,{ recursive:true,force:true }); }
});
