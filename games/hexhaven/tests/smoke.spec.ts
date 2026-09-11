import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { chooseAction } from '../src/bots/heuristic';
import { parseReplay } from '../src/app/persistence';
import { legalActions } from '../src/core/legal';
import { replay } from '../src/core/log';
import { handSize, type GameState } from '../src/core/state';

// Exercise the accessible, static UI; perf.spec.ts covers animated rendering.
test.use({ reducedMotion: 'reduce' });

type DebugWindow = Window & {
  readonly __hexhaven?: { readonly state: GameState | null };
  readonly __hexhavenMetrics?: () => {
    readonly drawCalls: number;
    readonly triangles: number;
    readonly frames: number;
    readonly frameMs: number;
  } | null;
};

async function readState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const state = (window as DebugWindow).__hexhaven?.state;
    if (state === undefined || state === null)
      throw new Error('The development game state is unavailable.');
    return state;
  });
}

async function placeThroughKeyboard(
  page: Page,
  phase: 'setupVillage' | 'setupRoad',
): Promise<void> {
  await page.waitForFunction((expected) => {
    const state = (window as DebugWindow).__hexhaven?.state;
    return state?.activePlayer === 0 && state.phase.type === expected;
  }, phase);
  const before = await readState(page);
  const preferred = chooseAction(before, 0);
  if (preferred.type !== 'placeVillage' && preferred.type !== 'placeRoad')
    throw new Error('Setup requires a placement action.');
  const target = preferred.type === 'placeVillage' ? preferred.vertex : preferred.edge;
  const placements = legalActions(before, 0).filter((action) => action.type === preferred.type);
  const index = placements.findIndex((action) =>
    action.type === 'placeVillage'
      ? action.vertex === target
      : action.type === 'placeRoad' && action.edge === target,
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const board = page.getByTestId('board-view');
  await board.focus();
  await board.press('Escape');
  for (let step = 0; step <= index; step += 1) await board.press('Tab');
  await expect(board).toHaveAttribute('data-selected-target', target);
  await board.press('Enter');
  await page.waitForFunction(
    (actionCount) => ((window as DebugWindow).__hexhaven?.state?.actions.length ?? 0) > actionCount,
    before.actions.length,
  );
  const after = await readState(page);
  expect(after.actions[before.actions.length]).toEqual(preferred);
}

async function persistedActionCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const opening = indexedDB.open('hexhaven', 1);
        opening.onerror = () => reject(new Error('Could not inspect the local save.'));
        opening.onsuccess = () => {
          const database = opening.result;
          const transaction = database.transaction('games', 'readonly');
          const request = transaction.objectStore('games').get('current');
          transaction.oncomplete = () => database.close();
          transaction.onabort = () => {
            database.close();
            reject(new Error('Could not read the local save.'));
          };
          request.onerror = () => reject(new Error('The local save is unavailable.'));
          request.onsuccess = () => {
            const value: unknown = request.result;
            resolve(
              typeof value === 'object' &&
                value !== null &&
                'actions' in value &&
                Array.isArray(value.actions)
                ? value.actions.length
                : -1,
            );
          };
        };
      }),
  );
}

test('real setup, production, exact resume, and persistent website appearance', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'violet');
  await expect(page.getByRole('heading', { name: /Hexhaven/ }).first()).toBeVisible();
  await page.getByRole('spinbutton', { name: 'Seed', exact: true }).fill('1');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByTestId('board-view')).toBeVisible();
  await expect(page.getByTestId('phase-instruction')).toBeVisible();
  const starting = await readState(page);
  expect(starting.options.layout).toBe('beginner');
  expect(starting.players.filter((player) => player.kind === 'bot')).toHaveLength(3);
  expect(starting.players[0]?.kind).toBe('human');

  for (const phase of ['setupVillage', 'setupRoad', 'setupVillage', 'setupRoad'] as const)
    await placeThroughKeyboard(page, phase);
  await page.waitForFunction(
    () => (window as DebugWindow).__hexhaven?.state?.phase.type === 'roll',
  );
  const beforeRoll = await readState(page);
  expect(
    beforeRoll.actions
      .filter((action) => action.type === 'placeVillage')
      .map((action) => action.player),
  ).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
  expect(beforeRoll.phase.type).toBe('roll');
  expect(
    Object.values(beforeRoll.buildings).filter((building) => building.owner === 0),
  ).toHaveLength(2);
  expect(Object.values(beforeRoll.roads).filter((owner) => owner === 0)).toHaveLength(2);
  const human = beforeRoll.players[0];
  if (human === undefined) throw new Error('The human player is missing.');
  const beforeCards = handSize(human.hand);
  await page.getByRole('button', { name: /^Roll dice/ }).click();
  await page.waitForFunction(
    () => (window as DebugWindow).__hexhaven?.state?.phase.type === 'action',
  );
  const produced = await readState(page);
  expect(produced.dice).toEqual([5, 4]);
  expect(handSize(produced.players[0]?.hand ?? human.hand)).toBeGreaterThan(beforeCards);
  // With forward setup, only the first village borders the seed's 9-hills tile.
  expect(produced.players[0]?.hand.brick).toBe(human.hand.brick + 1);
  await expect(page.getByTestId('player-hand')).toBeVisible();
  await expect.poll(() => persistedActionCount(page)).toBe(produced.actions.length);

  await page.reload();
  await page.waitForFunction(
    (count) => (window as DebugWindow).__hexhaven?.state?.actions.length === count,
    produced.actions.length,
  );
  const resumed = await readState(page);
  expect(resumed).toEqual(produced);
  expect(replay(resumed.options, resumed.actions)).toEqual(resumed);
  await expect(page.getByTestId('player-hand')).toBeVisible();
  await page.getByRole('button', { name: 'Log & replay', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export replay', exact: true }).click();
  const download = await downloading;
  const replayPath = await download.path();
  if (replayPath === null) throw new Error('The replay download did not produce a file.');
  const exported = parseReplay(await readFile(replayPath, 'utf8'));
  expect(exported.options).toEqual(resumed.options);
  expect(exported.actions).toEqual(resumed.actions);
  expect(replay(exported.options, exported.actions)).toEqual(resumed);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  const navigation = page.getByRole('navigation', { name: 'Game navigation', exact: true });
  await expect(navigation.getByRole('link', { name: 'Alena Martinková — portfolio' })).toHaveText(
    '[AM]',
  );
  await expect(navigation.getByRole('link', { name: 'Games', exact: true })).toHaveAttribute(
    'href',
    '/games/?lang=en',
  );
  await expect(navigation.locator('[aria-current="page"]')).toHaveText('Hexhaven');
  for (const label of ['New game', 'Switch to light theme', 'Settings'])
    await expect(navigation.getByRole('button', { name: label, exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const screenshot = fileURLToPath(
    new URL(`../docs/screenshots/${testInfo.project.name}.png`, import.meta.url),
  );
  await mkdir(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name} board`, {
    path: screenshot,
    contentType: 'image/png',
  });
  const metrics = await page.evaluate(() => (window as DebugWindow).__hexhavenMetrics?.() ?? null);
  await writeFile(screenshot.replace(/\.png$/, '.metrics.json'), JSON.stringify(metrics, null, 2));
  await testInfo.attach('Renderer measurements', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
  expect(metrics).not.toBeNull();
  if (metrics === null) throw new Error('Renderer measurements are unavailable.');
  expect(metrics.drawCalls).toBeGreaterThan(0);
  expect(metrics.drawCalls).toBeLessThanOrEqual(120);
  expect(metrics.triangles).toBeGreaterThan(0);
  expect(metrics.triangles).toBeLessThanOrEqual(150_000);

  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await navigation.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await readState(page)).toEqual(resumed);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(
    darkBackground,
  );
  await page.reload();
  await expect(page.getByTestId('player-hand')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await readState(page)).toEqual(resumed);

  await navigation.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Website accent', exact: true }).selectOption('cyan');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'cyan');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await readState(page)).toEqual(resumed);
  await page.reload();
  await expect(page.getByTestId('player-hand')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'cyan');
  expect(await readState(page)).toEqual(resumed);
  await navigation.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Website accent', exact: true })).toHaveValue(
    'cyan',
  );
  await page.getByRole('combobox', { name: 'Website accent', exact: true }).selectOption('violet');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'violet');
  expect(await page.evaluate(() => localStorage.getItem('accent'))).toBe('violet');
  expect(await readState(page)).toEqual(resumed);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const lightScreenshot = screenshot.replace(/\.png$/, '-light.png');
  await page.screenshot({ path: lightScreenshot, fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name} light board`, {
    path: lightScreenshot,
    contentType: 'image/png',
  });
  await navigation.getByRole('link', { name: 'Prepnúť do slovenčiny', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk');
  expect(await readState(page)).toEqual(resumed);
  const playerRows = page.locator('.hx-player');
  await expect(playerRows).toHaveCount(4);
  for (const playerRow of await playerRows.all()) {
    const rowBounds = await playerRow.boundingBox();
    const countBounds = await playerRow.locator('.hx-player-cards').boundingBox();
    expect(rowBounds).not.toBeNull();
    expect(countBounds).not.toBeNull();
    if (rowBounds === null || countBounds === null)
      throw new Error('Player card counts must remain visible.');
    expect(countBounds.x).toBeGreaterThanOrEqual(rowBounds.x);
    expect(countBounds.x + countBounds.width).toBeLessThanOrEqual(rowBounds.x + rowBounds.width);
    expect(countBounds.y).toBeGreaterThanOrEqual(rowBounds.y);
    expect(countBounds.y + countBounds.height).toBeLessThanOrEqual(rowBounds.y + rowBounds.height);
  }
  const slovakScreenshot = screenshot.replace(/\.png$/, '-sk-four-players.png');
  await page.screenshot({ path: slovakScreenshot, fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name} Slovak four-player board`, {
    path: slovakScreenshot,
    contentType: 'image/png',
  });
  expect(errors).toEqual([]);
});
