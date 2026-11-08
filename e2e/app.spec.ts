import { test,expect } from '@playwright/test';
import { zipSync } from 'fflate';
import { readFile } from 'node:fs/promises';

test('catalog, device filtering, issue search, related navigation, and deep links',async ({ page }) => {
  const errors:string[]=[]; page.on('pageerror',e => errors.push(e.message)); await page.goto('/');
  await expect(page.getByRole('heading',{ name:'Streaming Hardware Profiles' })).toBeVisible();
  await page.getByRole('button',{ name:'View issues for Amazon Fire TV Stick 4K Max (2nd Gen)',exact:true }).click();
  await expect(page.getByText(/Filtered to Amazon/)).toBeVisible(); await page.getByRole('button',{ name:'Clear filter',exact:true }).click();
  await page.getByRole('textbox',{ name:'Search issues' }).fill('storage'); await expect(page.getByRole('heading',{ name:'Chromecast 4K storage full bootloop warning',exact:true })).toBeVisible();
  await page.getByRole('button',{ name:'Related issues',exact:true }).click(); await expect(page.getByRole('dialog',{ name:'Related issues' })).toBeVisible(); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/#rag'); await expect(page.getByRole('heading',{ name:'Export the reference catalog' })).toBeVisible(); await expect(page.getByRole('button',{ name:'Download',exact:true })).toBeEnabled(); await page.getByRole('button',{ name:'Graph',exact:true }).click(); await expect(page.getByText(/Only explicit catalog\/database relationships are exported/)).toBeVisible(); await expect(page.getByRole('button',{ name:'Download',exact:true })).toBeEnabled();
  expect(errors).toEqual([]);
});
test('registration uses HTTP-only cookie and a real proof-of-work report persists',async ({ page,context }) => {
  await page.goto('/#issues'); await page.getByRole('button',{ name:'Sign in',exact:true }).click(); await page.getByRole('button',{ name:'Create an account',exact:true }).click();
  await page.getByLabel('Username',{ exact:true }).fill(`browser_${Date.now()}`); await page.getByLabel('Email',{ exact:true }).fill(`browser_${Date.now()}@example.com`); await page.getByLabel('Password',{ exact:true }).fill('browser-test-password'); await page.getByRole('dialog').getByRole('button',{ name:'Create account',exact:true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); const cookies=await context.cookies(); expect(cookies.find(c => c.name==='opencast_session')?.httpOnly).toBe(true); expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
  const content='Browser regression report: cache inspection completed.'; await page.getByLabel('Posting as',{ exact:false }).fill(content); await page.getByRole('button',{ name:'Submit report',exact:true }).click(); await expect(page.getByRole('status').filter({ hasText:'Report posted after' })).toBeVisible(); await expect(page.getByText(content,{ exact:true })).toBeVisible();
  await page.reload(); await expect(page.getByText(content,{ exact:true })).toBeVisible();
});
test('local APK checksum and persistent shortcode lookup',async ({ page }) => {
  await page.goto('/#apkinspector'); const buffer=zipSync({ 'AndroidManifest.xml':new Uint8Array([1,2,3]) });
  await page.getByLabel('APK file',{ exact:true }).setInputFiles({ name:'browser-test.apk',mimeType:'application/vnd.android.package-archive',buffer:Buffer.from(buffer) }); await page.getByRole('button',{ name:'Inspect local APK',exact:true }).click(); await expect(page.getByText('Computed SHA-256',{ exact:true })).toBeVisible(); await expect(page.getByText(/could not be parsed/)).toBeVisible();
  await page.getByLabel('Five-digit shortcode').fill('20002'); await page.getByRole('button',{ name:'Look up',exact:true }).click(); await expect(page.getByRole('link',{ name:'Open upstream source' })).toHaveAttribute('href','https://github.com/yuliskov/SmartTube/releases/latest');
});
test('assistant answers from local catalog and WebUSB never fakes a connection',async ({ page }) => {
  await page.goto('/'); await page.getByRole('button',{ name:'Open troubleshooting assistant' }).click(); await page.getByPlaceholder('Ask about ADB commands').fill('FireOS verification'); await page.getByRole('button',{ name:'Send message',exact:true }).click(); await expect(page.getByText('Sources:',{ exact:true }).last()).toBeVisible(); await expect(page.getByRole('heading',{ name:/FireOS 8 blocks/ })).toBeVisible();
  await page.goto('/#webadb'); await expect(page.getByRole('heading',{ name:'ADB device studio' })).toBeVisible(); await expect(page.getByRole('button',{ name:'Review & run' })).toBeDisabled(); await expect(page.getByRole('log')).toContainText('No device is connected');
});
test('analytics is opt-in and mobile navigation has no horizontal overflow',async ({ page }) => {
  await page.setViewportSize({ width:390,height:844 }); await page.goto('/#analytics'); const checkbox=page.getByRole('checkbox'); await expect(checkbox).not.toBeChecked(); await checkbox.check(); await expect(page.getByText('Anonymous pageview collection enabled for this browser.',{ exact:true })).toBeVisible();
  await page.getByRole('button',{ name:'Toggle navigation' }).click(); await page.getByRole('navigation',{ name:'Mobile navigation' }).getByRole('button',{ name:'APK inspector',exact:true }).click(); await expect(page.getByRole('heading',{ name:'APK inspector & package links' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
