import { expect, test, type Page } from '@playwright/test';

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'passed')
    await page.screenshot({ path: testInfo.outputPath('verified.png'), animations: 'disabled' });
});

test('portfolio and game list fit both languages', async ({ page }) => {
  for (const locale of ['en', 'sk']) {
    await page.goto(locale === 'sk' ? '/sk/?lang=sk' : '/?lang=en');
    await expect(page.locator('h1')).toBeVisible();
    await noOverflow(page);
    if (await page.locator('.nav__burger').isVisible()) {
      await page.locator('.nav__burger').click();
      await page.locator('.nav__menu a').last().click();
      await expect(page.locator('.nav__menu')).toHaveCount(0);
      await expect(page.locator('#contact')).toBeInViewport();
    }
    await page.goto(`/games/?lang=${locale}`);
    await expect(page.locator('.games-card')).toHaveCount(4);
    await expect(page.locator('.games-card__device')).toHaveCount(2);
    await expect(page.locator('.games-card__device').first()).toContainText(
      locale === 'sk' ? 'počítači' : 'desktop',
    );
    await noOverflow(page);
  }
});

test('touch devices receive localized desktop notices without downloading engines', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Desktop engine startup is checked separately.');
  for (const game of ['office-escape', 'forklift']) {
    for (const locale of ['en', 'sk']) {
      await page.goto(`/${game}/?lang=${locale}`);
      await expect(page.getByRole('heading', { name: locale === 'sk' ? 'Zahrajte si na počítači' : 'Play on desktop' })).toBeVisible();
      await expect(page.locator('#game')).toBeHidden();
      await expect(page.getByRole('link')).toHaveAttribute('href', `/games/?lang=${locale}`);
      const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
      expect(resources.filter(url => /\/(start-|Havok|glslang|twgsl)|\.wasm/.test(url))).toEqual([]);
      await noOverflow(page);
    }
  }
});

test('LEGO supports placement, undo and dialogs at every viewport', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/lego/?lang=en');
  await page.getByRole('button', { name: /^Build Tower,/ }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const canvas = page.locator('.game-stage canvas');
  await expect(canvas).toBeVisible();
  await noOverflow(page);
  await canvas.scrollIntoViewIfNeeded();
  if (isMobile) await canvas.tap();
  else await canvas.click();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(undo).toBeDisabled();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(errors).toEqual([]);
});

test('Hexhaven placement, trade and log controls remain reachable', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/hexhaven/?lang=en');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.locator('.hexhaven-canvas')).toBeVisible();
  const next = page.getByRole('button', { name: 'Next spot', exact: true });
  if (isMobile) await next.tap();
  else await next.click();
  if (isMobile) await page.getByTestId('selected-confirm').tap();
  else await page.getByTestId('selected-confirm').click();
  await expect(page.getByTestId('phase-instruction')).toContainText('road');
  for (const name of ['Trade', 'Log & replay']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.hx-side-content')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('desktop physics games load, play and pause', async ({ page, isMobile }) => {
  test.skip(isMobile, 'These games require a keyboard and mouse.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const game of ['office-escape', 'forklift']) {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto(`/${game}/?lang=en&webgl`);
    await expect(page.getByRole('heading', { name: 'Play on desktop' })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('.desktop-game')).toHaveCount(0);
    if (game === 'office-escape') {
      await expect(page.locator('#play')).toBeEnabled({ timeout: 60000 });
      await page.locator('#play').click();
    } else await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyW');
    await page.keyboard.press('Escape');
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#resume').click();
    await noOverflow(page);
  }
  // Exercise WebGPU when available, including the browser's WebGL fallback.
  await page.goto('/forklift/?lang=en');
  await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
  await expect(page.locator('#speed')).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});
