import { test, expect } from '@playwright/test';

test('production shell, local fonts, icons, and catalog work offline after one visit', async ({ page,context }) => {
  test.skip(process.env.E2E_PRODUCTION !== 'true','Run with npm run test:e2e:production');
  const errors: string[]=[];
  page.on('pageerror',e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{ name:'Streaming Hardware Profiles' })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if(!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange',() => resolve(),{ once:true })); });
  await expect.poll(() => page.evaluate(async () => { const keys=await caches.keys(); return keys.some(k => k.startsWith('opencast-')); })).toBe(true);
  for (const path of ['/icon-192.png','/icon-512.png','/manifest.json']) expect((await page.request.get(path)).ok()).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{ name:'Streaming Hardware Profiles' })).toBeVisible();
  await expect(page.getByText('Cached / offline mode',{ exact:true })).toBeVisible();
  await page.getByRole('button',{ name:'Open troubleshooting assistant' }).click();
  await page.getByLabel('Ask the catalog',{ exact:true }).fill('FireOS verification');
  await page.getByRole('button',{ name:'Send message',exact:true }).click();
  await expect(page.getByRole('heading',{ name:'Search from the browser’s cached catalog' })).toBeVisible();
  await expect(page.getByRole('heading',{ name:/FireOS 8 blocks/ })).toBeVisible();
  await page.getByRole('button',{ name:'Minimize chat',exact:true }).click();
  await page.goto('/#apkinspector');
  await page.getByLabel('Five-digit shortcode').fill('20002');
  await page.getByRole('button',{ name:'Look up',exact:true }).click();
  await expect(page.getByRole('link',{ name:'Open upstream source' })).toHaveAttribute('href','https://github.com/yuliskov/SmartTube/releases/latest');
  expect(errors).toEqual([]);
});

test('production CSP permits local APK hashing and blocks external script origins', async ({ page }) => {
  test.skip(process.env.E2E_PRODUCTION !== 'true','Run with npm run test:e2e:production');
  const response=await page.goto('/#apkinspector');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  await page.getByLabel('APK file',{ exact:true }).setInputFiles({ name:'csp-test.apk',mimeType:'application/vnd.android.package-archive',buffer:Buffer.from('not a manifest') });
  await page.getByRole('button',{ name:'Inspect local APK',exact:true }).click();
  await expect(page.getByText('Computed SHA-256',{ exact:true })).toBeVisible();
  await expect(page.getByText(/could not be parsed/)).toBeVisible();
});
