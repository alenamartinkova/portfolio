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

test('every game shares portfolio typography and theme colors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'All six engines are compared on desktop; mobile layouts have separate coverage.');
  for (const [theme, accent] of [['dark', 'violet'], ['light', 'cyan']]) {
    const preferences = `lang=en&theme=${theme}&accent=${accent}`;
    await page.goto('/?lang=en');
    await expect(page.locator('.m-nav .m-brand')).toBeVisible();
    const themeToggle = page.getByRole('button', { name: `Switch to ${theme} theme`, exact: true });
    if (await themeToggle.isVisible()) await themeToggle.click();
    await page.getByRole('button', { name: 'Accent color', exact: true }).click();
    await page.getByRole('button', { name: accent === 'cyan' ? 'Cyan' : 'Violet', exact: true }).click();
    await page.getByRole('button', { name: 'Accent color', exact: true }).click();
    const reference = await page.evaluate(() => ({
      background: getComputedStyle(document.documentElement).backgroundColor,
      headingFont: getComputedStyle(document.querySelector('h1')!).fontFamily,
      brandFont: getComputedStyle(document.querySelector('.m-nav .m-brand')!).fontFamily,
      accent: getComputedStyle(document.querySelector('.m-nav .m-brand span')!).color,
    }));
    for (const game of GAMES) {
      await page.goto(`/${game.id}/?${preferences}`);
      await expect(page.locator('.game-nav__mark')).toBeVisible({ timeout: 60000 });
      const heading = page.locator('h1:visible, h2:visible').first();
      await expect(heading).toHaveCSS('font-family', reference.headingFont);
      await expect(page.locator('.game-nav__mark')).toHaveCSS('font-family', reference.brandFont);
      await expect(page.locator('.game-nav__dot')).toHaveCSS('color', reference.accent);
      if (game.id === 'cable-management' || game.id === 'deploy-friday') {
        const background = await page.evaluate(() => {
          const body = getComputedStyle(document.body).backgroundColor;
          return body === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.documentElement).backgroundColor : body;
        });
        expect(background).toBe(reference.background);
        const action = game.id === 'cable-management'
          ? page.locator('.cm-modes button[aria-pressed="true"]')
          : page.locator('.stage-overlay .primary');
        await expect(action).toHaveCSS('background-color', reference.accent);
      }
      await noOverflow(page);
    }
  }
});

test('Deploy Friday navigation stays separate and game controls follow appearance changes', async ({ page }) => {
  await page.goto('/deploy-friday/?lang=en&theme=dark&accent=violet');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const trail = await page.locator('.game-nav__trail').boundingBox();
  const actions = await page.locator('.game-nav__actions').boundingBox();
  expect(trail && actions && (trail.x + trail.width <= actions.x + 1 || trail.y + trail.height <= actions.y + 1)).toBe(true);
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await page.getByRole('button', { name: 'Accent color', exact: true }).click();
  await page.getByRole('button', { name: 'Cyan', exact: true }).click();
  await page.getByRole('button', { name: 'Accent color', exact: true }).click();
  const accent = await page.locator('.game-nav__dot').evaluate(element => getComputedStyle(element).color);
  await expect(page.locator('.stage-overlay .primary')).toHaveCSS('background-color', accent);
  await page.getByRole('button', { name: 'Start the first wave ↗', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.paused-overlay')).toBeVisible();
  await noOverflow(page);
});

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
    await expect(page.locator('.games-card__device')).toHaveCount(0);
    await noOverflow(page);
  }
});

test('physics games support localized multitouch controls and release them on pause', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Desktop keyboard controls are covered separately.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const session = await page.context().newCDPSession(page);
  for (const game of ['office-escape', 'forklift']) {
    await page.goto(`/${game}/?lang=en`);
    if (game === 'office-escape') {
      await expect(page.locator('#play')).toBeEnabled({ timeout: 60000 });
      await page.locator('#play').tap();
    } else await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
    const controls = page.getByRole('region', { name: 'Touch controls' });
    await expect(controls).toBeVisible();
    const joystick = page.getByRole('group', { name: 'Joystick — move' });
    const action = controls.locator(game === 'forklift' ? '[data-code="KeyE"]' : '[data-code="Space"]');
    for (const item of await page.locator('.game-nav button:visible, .game-nav a:visible, .game-nav select:visible').all()) {
      const box = (await item.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    for (const button of await controls.getByRole('button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await expect(button).toBeInViewport();
    }
    const stick = (await joystick.boundingBox())!;
    const button = (await action.boundingBox())!;
    const touchPoints = [
      { id: 1, x: stick.x + stick.width / 2, y: stick.y + stick.height * .2 },
      { id: 2, x: button.x + button.width / 2, y: button.y + button.height / 2 },
    ];
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
    await expect(action).toHaveClass(/is-held/);
    if (game === 'forklift') {
      await expect.poll(async () => parseFloat((await page.locator('#forks').innerText()).replace(',', '.'))).toBeGreaterThan(.25);
      await expect.poll(async () => parseFloat((await page.locator('#speed').innerText()).replace(',', '.'))).toBeGreaterThan(0);
    } else {
      await expect(page.locator('#time')).not.toHaveText('00:00.000');
    }
    // A third finger can look around without cancelling movement or the held action.
    const camera = { id: 3, x: page.viewportSize()!.width / 2, y: page.viewportSize()!.height / 2 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [...touchPoints, camera] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [...touchPoints, { ...camera, x: camera.x + 25 }] });
    await expect(action).toHaveClass(/is-held/);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(controls.locator('.is-held')).toHaveCount(0);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
    await page.locator('#pause').click();
    await expect(controls).toBeHidden();
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.locator('#resume').tap();
    await expect(controls).toBeVisible();
    await expect(controls.locator('.is-held')).toHaveCount(0);
    await expect(controls.locator('.touch-stick__knob')).toHaveAttribute('style', '');
    // Cancellation and rotation must release all pointers as well.
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(controls.locator('.is-held')).toHaveCount(0);
    if (game === 'office-escape') {
      const sprint = controls.getByRole('button', { name: 'Sprint', exact: true });
      await sprint.tap();
      await expect(sprint).toHaveAttribute('aria-pressed', 'true');
      await sprint.tap();
      await expect(sprint).toHaveAttribute('aria-pressed', 'false');
    }
    const size = page.viewportSize()!;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints });
    await page.setViewportSize({ width: size.height, height: size.width });
    await expect(controls.locator('.is-held')).toHaveCount(0);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.setViewportSize(size);
    await page.locator('#settings-toggle').tap();
    await page.getByRole('link', { name: 'Prepnúť do slovenčiny' }).click();
    await page.locator('#settings-resume').tap();
    await expect(page.getByRole('region', { name: 'Dotykové ovládanie' })).toBeVisible();
    await expect(controls).toHaveCount(0);
    await expect(page.getByRole('button', { name: game === 'forklift' ? 'Brzda' : 'Skok', exact: true })).toBeVisible();
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
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
    await page.goto(`/${game}/?lang=en`);
    await expect(page.locator('#game')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('.desktop-game')).toHaveCount(0);
    if (game === 'office-escape') {
      await expect(page.locator('#play')).toBeEnabled({ timeout: 60000 });
      await page.locator('#play').click();
    } else {
      await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
      await expect(page.locator('#speed')).toBeVisible();
    }
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyW');
    await page.keyboard.press('Escape');
    await expect(page.locator('#resume')).toBeVisible();
    await page.locator('#resume').click();
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});


test('Forklift leaves the mobile driving view clear and keeps settings in pause', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The desktop HUD stays available.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/forklift/?lang=en');
  await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
  for (const selector of ['.mission', '.stats', '.context-hint', '.dashboard', '.game-settings'])
    await expect(page.locator(selector)).toBeHidden();
  await expect(page.locator('.mobile-goal')).toContainText('Target: B');
  const canvas = (await page.locator('#game').boundingBox())!;
  for (const control of await page.locator('.touch-stick, .touch-actions button').all()) {
    const box = (await control.boundingBox())!;
    expect(canvas.y + canvas.height).toBeLessThanOrEqual(box.y);
  }
  await page.locator('#pause').tap();
  await expect(page.locator('.mobile-menu-content')).toBeVisible();
  await page.locator('#settings-toggle').tap();
  await expect(page.locator('#choose-level')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: 'Prepnúť do slovenčiny', exact: true }).click();
  await page.locator('#settings-resume').tap();
  await page.locator('#pause').tap();
  await expect(page.locator('.mobile-menu-content')).toContainText('Škody v sklade');
  await page.locator('#settings-toggle').tap();
  await page.locator('#garage').click();
  await expect(page.locator('.garage-modal')).toBeVisible();
  await page.locator('#garage-done').click();
  await expect(page.locator('#overlay')).toBeHidden();
  await expect(page.locator('.game-settings')).toBeHidden();
  await page.locator('#settings-toggle').tap();
  await page.locator('#choose-level').tap();
  await page.locator('.level-card').nth(11).tap();
  await expect(page.locator('#overlay')).toBeHidden({ timeout: 60000 });
  await expect(page.locator('.mobile-goal')).toContainText('R-03');
  await expect(page.locator('.touch-controls')).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
});
