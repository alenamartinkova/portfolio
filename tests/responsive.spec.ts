import { expect, test, type Page } from '@playwright/test';
import { GAMES } from '../games/catalog.js';

test('Cable Management supports selection, rotation, placement and undo on mouse and touch', async ({ page, isMobile }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/cable-management/?lang=en');
  await expect(page.getByRole('heading', { name: 'A little less tangled.' })).toBeVisible();
  await page.getByRole('button', { name: 'Drawer', exact: true }).click();
  const first = page.locator('[data-piece]').first();
  const pieceId = await first.getAttribute('data-piece');
  if (isMobile) await first.tap(); else await first.click();
  await expect(page.getByRole('button', { name: 'Rotate R', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Rotate R', exact: true }).click();
  await expect(page.locator('#moves')).toHaveText('1 moves');
  await page.getByRole('button', { name: 'Flip F', exact: true }).click();
  await expect(page.locator('#moves')).toHaveText('2 moves');
  await page.getByRole('button', { name: '↶ Undo', exact: true }).click();
  await page.getByRole('button', { name: '↶ Undo', exact: true }).click();
  await expect(page.locator('#moves')).toHaveText('0 moves');
  const canvas = page.locator('#desk');
  if (isMobile) await canvas.tap(); else await canvas.click();
  await expect(page.locator('#status')).toContainText('1 /');
  await expect(page.locator(`[data-piece="${pieceId}"]`)).toHaveAttribute('aria-label', /Tidy/);
  await page.getByRole('button', { name: '↶ Undo', exact: true }).click();
  await expect(page.locator('#status')).toContainText('0 /');
  await expect(page.locator('#moves')).toHaveText('0 moves');
  await page.getByRole('link', { name: 'Prepnúť do slovenčiny' }).click();
  await expect(page.getByRole('heading', { name: 'Miesto pre každú drobnosť.' })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('Cable Management completes three evenings, unlocks daily and restores progress', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Full campaign is covered once; touch controls run at every viewport.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/cable-management/?lang=en');
  await expect(page.locator('#daily')).toBeDisabled();
  for (let level = 0; level < 12; level++) {
    const isDrawer = level % 4 >= 2;
    const steps = isDrawer ? await page.locator('[data-piece]').count() : 4 + Math.floor(level / 4) * 2;
    for (let step = 0; step < steps; step++) {
      if (await page.locator('#success').isVisible()) break;
      await page.getByRole('button', { name: '✧ A little help', exact: true }).click();
    }
    await expect(page.locator('#success')).toBeVisible();
    if (level < 11) await page.locator('#success button').click();
  }
  await expect(page.getByRole('heading', { name: 'A clear desk. A clear evening.' })).toBeVisible();
  await expect(page.locator('#daily')).toBeEnabled();
  await page.locator('#success button').click();
  await expect(page.locator('#level-label')).toContainText('Daily desk /');
  const dailyLabel = await page.locator('#level-label').textContent();
  await page.reload();
  await expect(page.locator('#daily')).toBeEnabled();
  await page.locator('#daily').click();
  await expect(page.locator('#level-label')).toHaveText(dailyLabel!);
  const drawerVisible = await page.locator('#tray-section').isVisible();
  const steps = drawerVisible ? await page.locator('[data-piece]').count() : 8;
  for (let step = 0; step < steps; step++) {
    if (await page.locator('#success').isVisible()) break;
    await page.getByRole('button', { name: '✧ A little help', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Enough for today.' })).toBeVisible();
  await page.reload();
  await page.locator('#daily').click();
  await expect(page.locator('#message')).toContainText('already tidy');
  expect(errors).toEqual([]);
});

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
    for (const section of ['about', 'stack', 'work', 'career', 'contact']) {
      await expect(page.locator(`.m-nav nav a[href="#${section}"]`)).toBeVisible();
    }
    await expect(page.locator('.m-nav a[href*="/games/"]')).toHaveCount(0);
    await expect(page.locator('.m-profile-note a')).toHaveAttribute('href', `/games/?lang=${locale}`);
    await expect(page.locator('.m-footer a[href*="/games/"]')).toHaveAttribute('href', `/games/?lang=${locale}`);
    await page.locator('.m-nav nav a[href="#contact"]').click();
    await expect(page.locator('#contact')).toBeInViewport();
    await page.goto(`/games/?lang=${locale}`);
    await expect(page.locator('.games-card')).toHaveCount(GAMES.length);
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

test('Brick Break supports placement, undo and dialogs at every viewport', async ({ page, isMobile }) => {
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
