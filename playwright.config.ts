import { defineConfig } from '@playwright/test';
import chromium from '@sparticuz/chromium';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if (process.platform === 'linux') process.env.LD_LIBRARY_PATH = [join(tmpdir(),'al2023','lib'),process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
const port = process.env.E2E_PORT || '3100';
const production = process.env.E2E_PRODUCTION === 'true';
export default defineConfig({
  testDir: './e2e', timeout: 45_000, expect: { timeout: 15_000 }, fullyParallel: false, workers: 1,
  reporter: [['list']], outputDir: 'test-results',
  use: { baseURL: `http://127.0.0.1:${port}`, viewport: { width:1440,height:1000 }, trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{ executablePath:await chromium.executablePath(),args:chromium.args.filter(a => !['--single-process','--disable-web-security','--allow-running-insecure-content'].includes(a)) } },
  webServer: { command:production ? 'npm run preview' : 'npm run dev',url:`http://127.0.0.1:${port}/health`,reuseExistingServer:false,timeout:60_000,env:{ PORT:port,DATABASE_PATH:':memory:',NODE_ENV:production ? 'production' : 'test',COOKIE_SECURE:'false',APP_URL:`http://127.0.0.1:${port}`,ENABLE_SCRAPERS:'false',ADMIN_USERNAME:'e2e_admin',ADMIN_EMAIL:'e2e@example.com',ADMIN_PASSWORD:'e2e-only-strong-password',DISABLE_HMR:'true' } }
});
