import { execFileSync,spawn } from 'node:child_process';
import { mkdtempSync,rmSync,readFileSync,existsSync } from 'node:fs';
import { createServer as createHttpsServer,request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac,randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

if (!existsSync('dist-server/server.js') || !existsSync('dist/index.html')) throw new Error('Run npm run build first.');
const dir=mkdtempSync(join(tmpdir(),'opencast-https-')); const key=join(dir,'key.pem'); const cert=join(dir,'cert.pem'); const database=join(dir,'test.sqlite');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{ stdio:'ignore' });
const secret=randomBytes(32).toString('hex'); const backendPort=3901; const proxyPort=3902; const origin=`https://localhost:${proxyPort}`;
const child=spawn(process.execPath,['dist-server/server.js'],{ env:{ ...process.env,NODE_ENV:'production',PORT:String(backendPort),DATABASE_PATH:database,APP_URL:origin,COOKIE_SECURE:'true',TRUST_PROXY_HOPS:'1',ANALYTICS_SECRET:secret,ENABLE_SCRAPERS:'false' },stdio:['ignore','pipe','pipe'] });
let serverLog=''; child.stdout.on('data',d => serverLog+=d); child.stderr.on('data',d => serverLog+=d);
const ca=readFileSync(cert);
const proxy=createHttpsServer({ key:readFileSync(key),cert:readFileSync(cert) },(req,res) => {
  const upstream=httpRequest({ hostname:'127.0.0.1',port:backendPort,path:req.url,method:req.method,headers:{ ...req.headers,'x-forwarded-for':'203.0.113.77','x-forwarded-proto':'https' } },r => { res.writeHead(r.statusCode || 502,r.headers); r.pipe(res); });
  upstream.on('error',() => { res.statusCode=502; res.end('proxy error'); }); req.pipe(upstream);
});
function call(path: string,method='GET',body?: unknown,headers: Record<string,string>={}): Promise<{ status:number; headers:Record<string,string|string[]|undefined>; body:any }> {
  return new Promise((resolve,reject) => {
    const payload=body===undefined ? undefined : JSON.stringify(body);
    const req=httpsRequest(`${origin}${path}`,{ method,ca,headers:{ ...(payload ? { 'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload) } : {}),...headers } },res => {
      const chunks:Buffer[]=[]; res.on('data',c => chunks.push(c)); res.on('end',() => { const text=Buffer.concat(chunks).toString(); let data; try { data=JSON.parse(text); } catch { data=text; } resolve({ status:res.statusCode || 0,headers:res.headers,body:data }); });
    }); req.on('error',reject); req.setTimeout(10_000,() => req.destroy(new Error('HTTPS request timeout'))); if(payload) req.write(payload); req.end();
  });
}
async function waitForHealth() { for(let i=0;i<50;i++) { if(child.exitCode!==null) throw new Error(`Server exited: ${serverLog}`); try { const r=await call('/health'); if(r.status===200) return; } catch {} await new Promise(r => setTimeout(r,200)); } throw new Error(`Health timeout: ${serverLog}`); }
try {
  await new Promise<void>((resolve,reject) => { proxy.once('error',reject); proxy.listen(proxyPort,'127.0.0.1',resolve); });
  await waitForHealth();
  const username=`tls_${Date.now()}`;
  const registered=await call('/api/auth/register','POST',{ username,email:`${username}@example.com`,password:'https-test-password' },{ Origin:origin });
  if(registered.status!==201) throw new Error(`Registration failed: ${JSON.stringify(registered.body)}`);
  const setCookie=String(registered.headers['set-cookie']?.[0] || ''); if(!/Secure/.test(setCookie) || !/HttpOnly/.test(setCookie) || !/SameSite=Strict/.test(setCookie)) throw new Error('Missing secure cookie attributes.');
  const cookie=setCookie.split(';')[0];
  const me=await call('/api/auth/me','GET',undefined,{ Cookie:cookie }); if(me.status!==200) throw new Error('Secure session was not accepted.');
  const rejected=await call('/api/auth/logout','POST',{},{ Origin:'https://evil.example',Cookie:cookie }); if(rejected.status!==403) throw new Error('Cross-origin write was not rejected.');
  const tracked=await call('/api/analytics/track','POST',{ page:'/https-check',consent:true },{ Origin:origin }); if(tracked.status!==200) throw new Error('Analytics through trusted proxy failed.');
  const db=new DatabaseSync(database);
  try { const row=db.prepare('SELECT daily_visitor_token FROM analytics_events WHERE page_url=?').get('/https-check') as { daily_visitor_token:string }; const day=new Date().toISOString().slice(0,10); const expected=createHmac('sha256',secret).update(`${day}:203.0.113.77`).digest('hex').slice(0,32); if(row.daily_visitor_token!==expected) throw new Error('TRUST_PROXY_HOPS=1 did not use the trusted proxy client IP.'); } finally { db.close(); }
  console.log('HTTPS acceptance passed: real TLS proxy, Secure/HttpOnly/Strict cookie, authenticated session, cross-origin rejection, and one trusted proxy hop.');
} finally {
  proxy.close(); child.kill('SIGTERM'); await new Promise<void>(resolve => { if(child.exitCode!==null) return resolve(); child.once('exit',() => resolve()); setTimeout(() => { child.kill('SIGKILL'); resolve(); },5000).unref(); }); rmSync(dir,{ recursive:true,force:true });
}
