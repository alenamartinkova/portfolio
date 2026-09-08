import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { legalActions } from '../src/core/legal';
import type { GameState } from '../src/core/state';

type DebugWindow = Window & {
  readonly __hexhaven?: { readonly state: GameState | null };
};

async function readState(page: Page): Promise<GameState> {
  return page.evaluate(() => {
    const state = (window as DebugWindow).__hexhaven?.state;
    if (!state) throw new Error('The development game state is unavailable.');
    return state;
  });
}

async function placeWithKeyboard(page: Page, type: 'placeVillage' | 'placeRoad'): Promise<void> {
  const before = await readState(page);
  const action = legalActions(before, before.activePlayer).find(
    (candidate) => candidate.type === type,
  );
  if (!action || (action.type !== 'placeVillage' && action.type !== 'placeRoad'))
    throw new Error('The expected setup placement is unavailable.');
  const target = action.type === 'placeVillage' ? action.vertex : action.edge;
  const board = page.getByTestId('board-view');
  await board.focus();
  await board.press('Escape');
  await board.press('Tab');
  await expect(board).toHaveAttribute('data-selected-target', target);
  await board.press('Enter');
  await expect
    .poll(async () => (await readState(page)).actions.length)
    .toBe(before.actions.length + 1);
  expect((await readState(page)).actions.at(-1)).toEqual(action);
}

async function savedActionCount(page: Page): Promise<number> {
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

test('Slovak follows the website, translates an existing game, and resumes without state changes', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./?lang=sk&theme=dark&accent=cyan');
  const html = page.locator('html');
  const setup = page.getByTestId('setup-dialog');
  await expect(html).toHaveAttribute('lang', 'sk');
  await expect(setup).toBeVisible();
  await expect(setup.getByRole('button', { name: 'Slovenčina', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(setup.locator('button[type="submit"]')).toHaveText('Začať hru');
  await setup.locator('[name="playerCount"]').selectOption('2');
  await setup.locator('[name="botCount"]').selectOption('0');
  await setup.locator('[name="seed"]').fill('1');
  await setup.getByRole('button', { name: 'English', exact: true }).click();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(setup.getByRole('button', { name: 'Start game', exact: true })).toBeVisible();
  await expect(setup.locator('[name="playerCount"]')).toHaveValue('2');
  await expect(setup.locator('[name="botCount"]')).toHaveValue('0');
  await setup.getByRole('button', { name: 'Slovenčina', exact: true }).click();
  await expect(setup.locator('[name="seed"]')).toHaveValue('1');
  await setup.getByRole('button', { name: 'Začať hru', exact: true }).click();
  await expect(setup).not.toBeVisible();
  await expect(page.getByTestId('board-view')).toHaveAttribute(
    'aria-label',
    /^Herná doska Hexhaven/,
  );
  await expect(page.locator('canvas.hexhaven-canvas')).toHaveAttribute(
    'aria-label',
    /^Herná doska Hexhaven/,
  );
  const starting = await readState(page);
  expect(starting.players).toHaveLength(2);
  expect(starting.players.every((player) => player.kind === 'human')).toBe(true);

  await placeWithKeyboard(page, 'placeVillage');
  await placeWithKeyboard(page, 'placeRoad');
  await page.getByRole('button', { name: 'Ukázať moje karty', exact: true }).click();
  const saved = await readState(page);
  expect(saved.actions).toHaveLength(2);
  await expect.poll(() => savedActionCount(page)).toBe(saved.actions.length);
  const hand = page.getByTestId('player-hand');
  for (const name of ['Drevo', 'Obilie', 'Vlna', 'Tehla', 'Ruda'])
    await expect(hand.getByText(name, { exact: true })).toBeVisible();
  const navigation = page.locator('.game-nav nav');
  await expect(navigation).toHaveAttribute('aria-label', 'Navigácia hry');
  await expect(navigation.getByRole('link', { name: 'Games', exact: true })).toHaveAttribute(
    'href',
    '/games/?lang=sk',
  );
  await expect(
    navigation.getByRole('link', { name: 'Alena Martinková — portfólio', exact: true }),
  ).toHaveAttribute('href', '/sk/');
  await page.locator('[data-command="toggle-log"]').click();
  const log = page.getByTestId('turn-log');
  await expect(log).toBeVisible();
  await expect(log).toContainText('Hráč 1: postavená dedina.');
  await expect(log).toContainText('Hráč 1: postavená cesta.');
  await navigation.getByRole('button', { name: 'English', exact: true }).click();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(log).toBeVisible();
  await expect(log).toContainText('Trader 1 built a village.');
  await expect(log).toContainText('Trader 1 built a road.');
  await expect(page.getByTestId('board-view')).toHaveAttribute('aria-label', /^Hexhaven board/);
  await expect(page.locator('canvas.hexhaven-canvas')).toHaveAttribute(
    'aria-label',
    /^Hexhaven board/,
  );
  await expect(navigation.getByRole('link', { name: 'Games', exact: true })).toHaveAttribute(
    'href',
    '/games/?lang=en',
  );
  await expect(
    navigation.getByRole('link', { name: 'Alena Martinková — portfolio', exact: true }),
  ).toHaveAttribute('href', '/');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('en');
  expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('en');
  expect(await readState(page)).toEqual(saved);
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-accent', 'cyan');
  await navigation.getByRole('button', { name: 'Slovenčina', exact: true }).click();
  await expect(log).toBeVisible();
  await expect(log).toContainText('Hráč 1: postavená dedina.');
  await expect(log).not.toContainText('Trader 1 built a village.');
  expect(await readState(page)).toEqual(saved);
  await page.locator('[data-command="close-panel"]').click();

  await navigation.getByRole('button', { name: 'Nastavenia', exact: true }).click();
  const settings = page.getByRole('dialog');
  await expect(settings.getByRole('group', { name: 'Jazyk', exact: true })).toBeVisible();
  await expect(settings.locator('[data-site-accent]')).toHaveValue('cyan');
  await expect(settings.locator('[data-site-accent]').locator('..')).toContainText('Akcent webu');
  await expect(settings.locator('[data-setting="animationSpeed"]').locator('..')).toContainText(
    'Rýchlosť animácií',
  );
  await settings.locator('[data-site-accent]').selectOption('violet');
  await settings.locator('[data-site-accent]').selectOption('cyan');
  await settings.locator('[data-command="close-settings"]').click();
  await page.reload();
  await expect(page.getByTestId('privacy-overlay')).toBeVisible();
  expect(await readState(page)).toEqual(saved);
  await expect(html).toHaveAttribute('lang', 'sk');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-accent', 'cyan');
  await expect(page.locator('canvas.hexhaven-canvas')).toHaveAttribute(
    'aria-label',
    /^Herná doska Hexhaven/,
  );
  expect(new URL(page.url()).searchParams.get('lang')).toBe('sk');
  expect(await page.evaluate(() => localStorage.getItem('locale'))).toBe('sk');
  await page.goto('./');
  await expect(page.getByTestId('privacy-overlay')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('lang')).toBe(false);
  await expect(html).toHaveAttribute('lang', 'sk');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-accent', 'cyan');
  expect(await readState(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Ukázať moje karty', exact: true }).click();
  for (const control of await navigation.getByRole('button').all())
    await expect(control).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const screenshot = fileURLToPath(
    new URL(`../docs/screenshots/${testInfo.project.name}-sk.png`, import.meta.url),
  );
  await mkdir(dirname(screenshot), { recursive: true });
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${testInfo.project.name} Slovak board`, {
    path: screenshot,
    contentType: 'image/png',
  });
  expect(errors).toEqual([]);
});
