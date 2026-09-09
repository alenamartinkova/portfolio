import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Navigation checks do not need continuously pulsing hints behind the toolbar.
test.use({ reducedMotion: 'reduce' });

async function expectHeader(page: Page, building: boolean): Promise<void> {
  const header = page.getByRole('navigation', { name: 'Game navigation', exact: true });
  await expect(header.getByRole('link', { name: 'Back to portfolio' })).toHaveText('[AM]');
  await expect(header.getByRole('link', { name: 'Games', exact: true })).toHaveAttribute(
    'href',
    '/games/?lang=en',
  );
  await expect(header.getByRole('button', { name: 'brick break', exact: true })).toBeInViewport();
  for (const name of [
    'English',
    'Slovenčina',
    'Copy game link',
    'Turn sound on',
    'Settings',
    'How to play',
  ])
    await expect(header.getByRole('button', { name, exact: true })).toBeInViewport();
  await expect(
    header.getByRole('button', { name: /^Switch to (light|dark) theme$/ }),
  ).toBeInViewport();
  if (building)
    await expect(header.getByRole('button', { name: 'All models', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('This test requires a fixed viewport.');
  for (const control of await header.locator('a, button').all()) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) throw new Error('A header control has no visible bounds.');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  }
}

async function capture(page: Page, testInfo: TestInfo, screen: string): Promise<void> {
  const path = fileURLToPath(
    new URL(`../docs/screenshots/lego-${testInfo.project.name}-${screen}.png`, import.meta.url),
  );
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  await testInfo.attach(`LEGO ${testInfo.project.name} ${screen}`, {
    path,
    contentType: 'image/png',
  });
}

test('shared LEGO navigation remains usable across screens, themes, and locales', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('http://127.0.0.1:4176/lego/');
  // A running development server must not hide a misconfigured build preview.
  await expect(page.locator('script[src$="/@vite/client"]')).toHaveCount(0);
  await expect(page.locator('script[type="module"][src^="/lego/assets/"]')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'What will you build today?', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectHeader(page, false);
  await capture(page, testInfo, 'collection');

  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Slovenčina', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'What will you build today?', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectHeader(page, false);
  await capture(page, testInfo, 'collection-light');

  await page.getByRole('button', { name: /^Build Tower,/ }).click();
  await expect(page.getByRole('dialog', { name: 'Good things click together.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tower', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.game-stage canvas')).toBeVisible();
  await expectHeader(page, true);
  const toolbar = page.getByRole('group', { name: 'Build', exact: true });
  for (const name of ['Build', 'Rotate', 'Pick', 'Remove', 'Undo', 'Redo', 'Compare'])
    await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: /^Hint/ })).toBeVisible();
  await capture(page, testInfo, 'build-light');

  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectHeader(page, true);
  await capture(page, testInfo, 'build');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Your corner, your way.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Good things click together.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'All models', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'What will you build today?', exact: true }),
  ).toBeVisible();
  await expectHeader(page, false);
  expect(errors).toEqual([]);
});
