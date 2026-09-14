import { test, expect, type Page } from '@playwright/test'
import { GAMES } from '../games/catalog.js'
import { writeFile } from 'node:fs/promises'

declare global { interface Window { gameDraws: number; gameContexts: number; gameSamples: { draws: number; cpu: number; at: number }[]; gameLcp: number; gameTbt: number } }
declare global { interface Window { rackBuffers: { live: Set<WebGLBuffer>; textures: Set<WebGLTexture>; deleted: number } } }

async function instrument(page: Page) {
  await page.addInitScript(() => {
    window.gameDraws = 0
    window.gameContexts = 0
    window.gameSamples = []; window.gameLcp = 0; window.gameTbt = 0
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.gameLcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.gameTbt += Math.max(0, entry.duration - 50) }).observe({ type: 'longtask', buffered: true })
    const raf = window.requestAnimationFrame
    window.requestAnimationFrame = callback => raf(at => {
      const before = window.gameDraws, start = performance.now()
      callback(at)
      if (window.gameDraws > before && window.gameSamples.length < 3000) window.gameSamples.push({ draws: window.gameDraws - before, cpu: performance.now() - start, at })
    })
    const getContext = HTMLCanvasElement.prototype.getContext, seen = new WeakSet()
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const context = getContext.apply(this, args)
      if (context && /^webgl/.test(args[0]) && !seen.has(context)) {
        seen.add(context)
        window.gameContexts++
        this.addEventListener('webglcontextlost', () => { window.gameContexts-- }, { once: true })
      }
      return context
    }
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const original = prototype[method]
        if (!original) continue
        prototype[method] = function (...args) { window.gameDraws++; return original.apply(this, args) }
      }
    }
  })
}
async function idle(page: Page) {
  // Allow physical settling, damping and finite action feedback to finish.
  await page.waitForTimeout(3500)
  const before = await page.evaluate(() => window.gameDraws)
  await page.waitForTimeout(600)
  expect(await page.evaluate(() => window.gameDraws)).toBe(before)
}

test('catalog is visible without JavaScript and hydrates stored Slovak/light preferences', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const staticPage = await context.newPage()
  await staticPage.goto('http://127.0.0.1:4288/games/')
  for (const game of GAMES) await expect(staticPage.getByRole('heading', { name: game.title, exact: false })).toBeVisible()
  await context.close()
  const errors: string[] = []
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript(() => { localStorage.setItem('locale', 'sk'); localStorage.setItem('theme', 'light') })
  await page.goto('/games/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'sk')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(errors).toEqual([])
})

test('office-escape: rapid jump input cannot avoid lava recovery', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/office-escape/?lang=en')
  await page.locator('#play').click()
  await page.keyboard.down('s')
  await page.keyboard.down('Shift')
  // Jump backwards off the starting desk and keep buffering the next jump.
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Space')
    await page.waitForTimeout(35)
    if (Number(await page.locator('#falls').textContent()) > 0) break
  }
  await page.keyboard.up('s')
  await page.keyboard.up('Shift')
  await expect.poll(async () => Number(await page.locator('#falls').textContent())).toBeGreaterThan(0)
  const falls = await page.locator('#falls').textContent()
  await page.waitForTimeout(1000)
  await expect(page.locator('#falls')).toHaveText(falls)
  expect(errors).toEqual([])
})

for (const id of ['office-escape', 'forklift', 'turnaround']) test(`${id}: leaving during physics initialization cancels construction`, async ({ page }, info) => {
  test.skip(id === 'turnaround' && info.project.name === 'mobile', 'Desktop notice deliberately never downloads physics');
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await instrument(page)
  let release!: () => void, requested!: () => void
  const waiting = new Promise<void>(resolve => { requested = resolve })
  const barrier = new Promise<void>(resolve => { release = resolve })
  await page.route('**/*.wasm', async route => { requested(); await barrier; await route.continue() })
  await page.goto(`/${id}/?lang=en`, { waitUntil: 'domcontentloaded' })
  await waiting
  // Keep the document inspectable while exercising the real permanent-pagehide path.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })))
  const draws = await page.evaluate(() => window.gameDraws)
  release()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('.game-fps')).toHaveCount(0)
  await expect(page.locator('.desktop-game')).toHaveCount(0)
  expect(await page.evaluate(() => window.gameDraws)).toBe(draws)
  expect(errors).toEqual([])
})

for (const game of GAMES) test(`${game.id}: production rendering, idle and interaction`, async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await instrument(page)
  await page.goto(`/${game.id}/?lang=en`)
  await expect(page.locator('.game-fps')).toHaveCount(1)
  await expect(page.locator('.game-fps')).toBeVisible()
  await expect(page.locator('.desktop-game')).toHaveCount(0)
  if (game.desktopOnly && info.project.name === 'mobile') {
    await expect(page.getByRole('heading', { name: 'This shift needs a keyboard.' })).toBeVisible()
    expect(await page.evaluate(() => window.gameContexts)).toBe(0)
    expect(errors).toEqual([])
    return
  }
  if (game.id === 'lego') {
    await page.locator('.game-model-card').first().click()
    await page.getByRole('button', { name: 'Close', exact: true }).click()
  }
  await expect.poll(() => page.evaluate(() => window.gameDraws)).toBeGreaterThan(0)
  await idle(page)
  await expect(page.locator('.game-fps')).toHaveText('0 FPS')
  await page.screenshot({ path: info.outputPath(`${game.id}.png`) })
  if (game.id === 'office-escape') {
    await page.locator('#play').click()
    const before = await page.evaluate(() => window.gameDraws)
    await expect.poll(() => page.evaluate(() => window.gameDraws)).toBeGreaterThan(before)
    await expect(page.locator('.game-fps')).not.toHaveText('0 FPS')
    await page.keyboard.press('Escape')
    await idle(page)
    await page.locator('#resume').click()
  } else if (game.id === 'forklift') {
    const before = await page.evaluate(() => window.gameDraws)
    await page.keyboard.down('w')
    await expect(page.locator('.game-fps')).not.toHaveText('0 FPS')
    await page.waitForTimeout(500)
    await page.keyboard.up('w')
    expect(await page.evaluate(() => window.gameDraws)).toBeGreaterThan(before)
    await page.keyboard.press('Escape')
    await idle(page)
  } else if (game.id === 'turnaround') {
    await page.getByRole('button', { name: 'Start shift ↗', exact: true }).click()
    await expect(page.locator('#phase')).toHaveText('01 / Final approach')
    await expect(page.locator('.game-fps')).not.toHaveText('0 FPS')
    await page.waitForTimeout(2200)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Your flight can wait.' })).toBeVisible()
    const time = await page.locator('#clock').textContent()
    await idle(page)
    await expect(page.locator('#clock')).toHaveText(time!)
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Restart flight', exact: true }).click()
      await expect(page.locator('#phase')).toBeVisible()
      await expect(page.locator('#phase')).toHaveText('01 / Final approach')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('heading', { name: 'Your flight can wait.' })).toBeVisible()
    }
    expect(await page.evaluate(() => window.gameContexts)).toBe(1)
    await idle(page)
  } else if (game.id === 'deploy-friday') {
    await page.locator('#campaign-back').click()
    await page.locator('#start').click()
    const before = await page.evaluate(() => window.gameDraws)
    await expect.poll(() => page.evaluate(() => window.gameDraws)).toBeGreaterThan(before)
    await page.locator('#pause').click()
    await idle(page)
  } else if (game.id === 'cable-management') {
    const canvas = page.locator('#desk'), rect = (await canvas.boundingBox())!
    const before = await page.evaluate(() => window.gameDraws)
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
    await page.mouse.move(rect.x + rect.width / 2 + 30, rect.y + rect.height / 2)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => window.gameDraws)).toBe(before)
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-action="drawer"]').click()
      await page.locator('[data-action="untangle"]').click()
    }
    await idle(page)
    expect(await page.evaluate(() => window.gameContexts)).toBe(1)
  } else if (game.id === 'hexhaven') {
    await page.locator('[data-focus="start-game"]').click()
    await expect(page.locator('.hexhaven-canvas')).toHaveCount(1)
    await idle(page)
    expect(await page.evaluate(() => window.gameContexts)).toBe(1)
  } else if (game.id === 'lego') {
    const before = await page.evaluate(() => window.gameDraws)
    await page.getByRole('button', { name: 'Rotate', exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.gameDraws)).toBeGreaterThan(before)
    await page.getByRole('button', { name: 'All models', exact: true }).click()
    await expect(page.locator('.game-stage canvas')).toHaveCount(0)
    await idle(page)
    expect(await page.evaluate(() => window.gameContexts)).toBe(0)
  }
  const metrics = await page.evaluate(() => {
    const samples = window.gameSamples.filter(s => s.at > 1000), resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    return { userAgent: navigator.userAgent, viewport: [innerWidth, innerHeight], dpr: devicePixelRatio, lcpMs: window.gameLcp, longTaskBlockingMs: window.gameTbt,
      jsEncodedBytes: resources.filter(r => /\.js(?:\?|$)/.test(r.name)).reduce((sum, r) => sum + r.encodedBodySize, 0),
      wasmEncodedBytes: resources.filter(r => r.name.endsWith('.wasm')).reduce((sum, r) => sum + r.encodedBodySize, 0),
      renderedSamples: samples.length, meanDraws: samples.reduce((sum, s) => sum + s.draws, 0) / Math.max(1, samples.length),
      meanCallbackCpuMs: samples.reduce((sum, s) => sum + s.cpu, 0) / Math.max(1, samples.length), maxCallbackCpuMs: Math.max(0, ...samples.map(s => s.cpu)),
      activeFrameIntervalsMs: samples.slice(1).map((s, i) => s.at - samples[i].at).filter(d => d < 100) }
  })
  await info.attach('performance.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' })
  await writeFile(info.outputPath('performance.json'), JSON.stringify(metrics, null, 2))
  expect(errors).toEqual([])
})

for (const [game, level] of [['forklift', 'shelf-service'], ['office-escape', 'rolling-stock'], ['office-escape', 'first-evening']]) test(`${game} ${level}: shared models and textures survive scene replacement and disposal`, async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await instrument(page);
  await page.addInitScript(() => {
    const buffers = window.rackBuffers = { live: new Set<WebGLBuffer>(), textures: new Set<WebGLTexture>(), deleted: 0 };
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const create = prototype.createBuffer, dispose = prototype.deleteBuffer;
      prototype.createBuffer = function () {
        const buffer = create.call(this);
        if (buffer) buffers.live.add(buffer);
        return buffer;
      };
      prototype.deleteBuffer = function (buffer) {
        if (buffer && buffers.live.delete(buffer)) buffers.deleted++;
        return dispose.call(this, buffer);
      };
      const createTexture = prototype.createTexture, deleteTexture = prototype.deleteTexture;
      prototype.createTexture = function () {
        const texture = createTexture.call(this);
        if (texture) buffers.textures.add(texture);
        return texture;
      };
      prototype.deleteTexture = function (texture) {
        if (texture) buffers.textures.delete(texture);
        return deleteTexture.call(this, texture);
      };
    }
  });
  await page.goto(`/${game}/?lang=en&level=${level}`);
  await expect(page.locator('#settings-toggle')).toBeEnabled();
  await expect(page.locator('.desktop-game')).toHaveCount(0);
  await idle(page);
  const baseline = await page.evaluate(() => window.rackBuffers.live.size);
  const baselineTextures = await page.evaluate(() => window.rackBuffers.textures.size);
  expect(baseline).toBeGreaterThan(0);
  for (let i = 0; i < 3; i++) {
    const deleted = await page.evaluate(() => window.rackBuffers.deleted);
    if (game === 'forklift') await page.keyboard.press('r');
    else {
      await page.locator('#settings-toggle').click();
      await page.locator('#choose-level').click();
      await page.locator(`[data-level="${level}"]`).click();
    }
    await expect.poll(() => page.evaluate(() => window.rackBuffers.deleted)).toBeGreaterThan(deleted);
    await expect(page.locator('#settings-toggle')).toBeEnabled();
    await idle(page);
    expect(await page.evaluate(() => window.rackBuffers.live.size)).toBe(baseline);
    expect(await page.evaluate(() => window.rackBuffers.textures.size)).toBe(baselineTextures);
  }
  if (game === 'office-escape') await page.locator('#play').click();
  // Reduced-motion/visibility handling must still wake the newly created scene.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('#resume')).toBeVisible();
  await idle(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.locator('#resume').click();
  const draws = await page.evaluate(() => window.gameDraws);
  await page.keyboard.down('w');
  await expect.poll(() => page.evaluate(() => window.gameDraws)).toBeGreaterThan(draws);
  await page.keyboard.up('w');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
  expect(await page.evaluate(() => window.rackBuffers.live.size)).toBe(0);
  expect(await page.evaluate(() => window.rackBuffers.textures.size)).toBe(0);
  expect(errors).toEqual([]);
});

test('turnaround: hidden tabs pause a reduced-motion flight and preserve the clock', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Desktop-only flight controls')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await instrument(page)
  await page.goto('/turnaround/?flight=2&lang=en')
  await page.getByRole('button', { name: 'Start shift ↗', exact: true }).click()
  await expect(page.locator('#phase')).toBeVisible()
  await expect(page.locator('#phase')).toHaveText('01 / Final approach')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.getByRole('heading', { name: 'Your flight can wait.' })).toBeVisible()
  const clock = await page.locator('#clock').textContent()
  await idle(page)
  await expect(page.locator('#clock')).toHaveText(clock!)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.getByRole('button', { name: 'Resume shift →', exact: true }).click()
  await expect(page.locator('.game-fps')).not.toHaveText('0 FPS')
})
