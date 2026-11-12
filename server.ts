import 'dotenv/config';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readConfig } from './src/server/config.ts';

async function startServer() {
  // Validate before opening SQLite or bootstrapping an administrator.
  const config = readConfig();
  if (config.production && !existsSync(resolve('dist/index.html'))) throw new Error('Missing production build. Run npm run build first.');
  const [{ StreamingStore }, { createApi }] = await Promise.all([import('./src/server/db.ts'), import('./src/server/app.ts')]);
  const store = new StreamingStore(config.databasePath, { analyticsSecret: config.analyticsSecret, admin: config.admin });
  const app = createApi(store, config);
  const server = createHttpServer(app);
  let vite: import('vite').ViteDevServer | undefined;
  if (!config.production) {
    const { createServer } = await import('vite');
    // Share the HTTP listener so concurrent instances never contend for port 24678.
    vite = await createServer({ server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(resolve('dist'), { index: false, maxAge: '1h', setHeaders(res,path) { if (path.endsWith('sw.js') || path.endsWith('index.html')) res.setHeader('Cache-Control','no-cache'); } }));
    app.get('*',(_req,res) => res.sendFile(resolve('dist/index.html')));
  }
  server.listen(config.port,'0.0.0.0',() => console.log(`OpenCast listening on http://0.0.0.0:${config.port}`));
  server.requestTimeout = 30_000;
  const timer = setInterval(() => store.maintenance(),3_600_000); timer.unref();
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true; clearInterval(timer);
    server.close(async () => { try { await vite?.close(); store.close(); process.exit(0); } catch { process.exit(1); } });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1),10_000).unref();
  };
  process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
  server.on('error',error => { console.error(error); process.exit(1); });
}
startServer().catch(error => { console.error(error instanceof Error ? error.message : 'Startup failed.'); process.exit(1); });
