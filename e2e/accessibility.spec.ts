import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('primary views and authentication dialog have no automatically detectable WCAG A/AA violations', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const scan = async (label: string) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), label).toEqual([]);
  };

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Streaming Hardware Profiles' })).toBeVisible();
  await scan('desktop catalog');

  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Sign in', exact: true })).toBeVisible();
  await scan('authentication dialog');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await scan('mobile navigation');
  expect(errors).toEqual([]);
});
