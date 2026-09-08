import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, release } from 'node:os';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { chooseAction } from '../src/bots/heuristic';
import { getActor } from '../src/core/legal';
import { reduce } from '../src/core/reducer';
import { createGame, type GameState } from '../src/core/state';
import type { ReplayData } from '../src/app/persistence';

function lateGameReplay(): ReplayData {
  let state = createGame({
    seed: 28,
    layout: 'random',
    players: ['You', 'Rowan', 'Mira', 'Jules'].map((name, id) => ({
      name,
      kind: id === 0 ? 'human' : 'bot',
      difficulty: 'normal',
    })),
  });
  let occupied: GameState | null = null;
  while (state.phase.type !== 'gameOver') {
    if (state.turn >= 400) throw new Error('The performance replay did not finish in 400 turns.');
    state = reduce(state, chooseAction(state, getActor(state)));
    if (state.activePlayer === 0 && state.phase.type === 'action') occupied = state;
  }
  if (occupied === null) throw new Error('The replay has no late human turn.');
  return { version: 1, options: occupied.options, actions: occupied.actions };
}

async function sampleFrames(page: Page, duration: number) {
  return page.evaluate(async (milliseconds) => {
    const startMetrics = window.__hexhavenMetrics?.();
    if (startMetrics === undefined || startMetrics === null)
      throw new Error('Renderer counters are missing.');
    const start = performance.now();
    let previous = start;
    const intervals: number[] = [];
    const cpuSamples: number[] = [];
    await new Promise<void>((resolve) => {
      const sample = (now: number): void => {
        intervals.push(now - previous);
        previous = now;
        const metrics = window.__hexhavenMetrics?.();
        if (metrics !== undefined && metrics !== null) cpuSamples.push(metrics.frameMs);
        if (now - start >= milliseconds) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const elapsed = performance.now() - start;
    const endMetrics = window.__hexhavenMetrics?.();
    if (endMetrics === undefined || endMetrics === null)
      throw new Error('Renderer counters were lost.');
    const sorted = [...intervals].sort((first, second) => first - second);
    return {
      elapsedMs: elapsed,
      browserRafFrames: intervals.length,
      browserRafFps: (intervals.length * 1000) / elapsed,
      rendererFrames: endMetrics.frames - startMetrics.frames,
      rendererFps: ((endMetrics.frames - startMetrics.frames) * 1000) / elapsed,
      rafMedianMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
      rafP95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      rendererCpuEwmaMeanMs: cpuSamples.reduce((sum, value) => sum + value, 0) / cpuSamples.length,
      renderer: endMetrics,
    };
  }, duration);
}

test('1440p occupied-board measurements and production debug isolation', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeVisible();
  const replay = lateGameReplay();
  await page.evaluate((data) => {
    if (window.__hexhaven === undefined) throw new Error('The dev replay API is unavailable.');
    window.__hexhaven.loadReplay(data);
  }, replay);
  await page.waitForFunction(
    (count) => window.__hexhaven?.state?.actions.length === count,
    replay.actions.length,
  );
  const occupancy = await page.evaluate(() => {
    const state = window.__hexhaven?.state;
    if (state === undefined || state === null) throw new Error('The imported game is missing.');
    return {
      turn: state.turn,
      roads: Object.keys(state.roads).length,
      villages: Object.values(state.buildings).filter((piece) => piece.kind === 'village').length,
      towns: Object.values(state.buildings).filter((piece) => piece.kind === 'town').length,
    };
  });
  expect(occupancy.roads).toBeGreaterThanOrEqual(20);
  expect(occupancy.villages + occupancy.towns).toBeGreaterThanOrEqual(10);

  const board = page.getByTestId('board-view');
  const bounds = await board.boundingBox();
  if (bounds === null) throw new Error('The board has no screen bounds.');
  const center = { x: bounds.x + bounds.width * 0.55, y: bounds.y + bounds.height * 0.5 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  const activeMeasurement = sampleFrames(page, 2000);
  for (let step = 0; step < 100; step += 1) {
    await page.mouse.move(
      center.x + Math.sin(step / 15) * 120,
      center.y + Math.cos(step / 17) * 35,
    );
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
  }
  await page.mouse.up();
  const active = await activeMeasurement;
  await sampleFrames(page, 1600);
  const idle = await sampleFrames(page, 1800);
  const browser = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="board-view"] canvas');
    const gl = canvas?.getContext('webgl2');
    const debug: unknown = gl?.getExtension('WEBGL_debug_renderer_info');
    let renderer: unknown = null;
    let vendor: unknown = null;
    if (
      gl &&
      typeof debug === 'object' &&
      debug !== null &&
      'UNMASKED_RENDERER_WEBGL' in debug &&
      typeof debug.UNMASKED_RENDERER_WEBGL === 'number' &&
      'UNMASKED_VENDOR_WEBGL' in debug &&
      typeof debug.UNMASKED_VENDOR_WEBGL === 'number'
    ) {
      renderer = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);
      vendor = gl.getParameter(debug.UNMASKED_VENDOR_WEBGL);
    }
    return {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      renderer: typeof renderer === 'string' ? renderer : null,
      vendor: typeof vendor === 'string' ? vendor : null,
    };
  });
  for (const measurement of [active, idle]) {
    expect(measurement.renderer.drawCalls).toBeLessThanOrEqual(120);
    expect(measurement.renderer.triangles).toBeLessThanOrEqual(150_000);
    expect(measurement.rendererFrames).toBeGreaterThan(0);
  }
  const output = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: `${output}performance-1440p.png`, animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await sampleFrames(page, 700);
  const reducedMotion = await sampleFrames(page, 900);
  expect(reducedMotion.browserRafFrames).toBeGreaterThan(0);
  expect(reducedMotion.rendererFrames).toBe(0);
  const report = {
    measuredAt: new Date().toISOString(),
    host: {
      platform: platform(),
      release: release(),
      architecture: arch(),
      cpu: cpus()[0]?.model ?? null,
    },
    browser,
    occupancy,
    active,
    idle,
    reducedMotion,
    interpretation:
      'Renderer FPS uses actual rendered-frame counters. Browser RAF is scheduling cadence, not rendered throughput. CPU EWMA is scene work plus WebGL submission time; it excludes asynchronous GPU completion. This headless host measurement is not integrated-GPU certification. Idle sea animation intentionally uses a lower frame rate.',
  };
  await writeFile(`${output}performance.json`, JSON.stringify(report, null, 2));
  await testInfo.attach('1440p measurements', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });

  const assets = new URL('../../build/hexhaven/assets/', import.meta.url);
  const scripts = (await readdir(assets)).filter((name) => name.endsWith('.js'));
  expect(scripts.length).toBeGreaterThan(0);
  for (const script of scripts)
    expect(await readFile(new URL(script, assets), 'utf8')).not.toContain('__hexhaven');
  await page.goto('http://127.0.0.1:4175/hexhaven/');
  await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeVisible();
  expect(await page.evaluate(() => '__hexhaven' in window || '__hexhavenMetrics' in window)).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
