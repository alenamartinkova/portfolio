import { test, expect, type Page } from '@playwright/test'
import { GAMES } from '../games/catalog.js'

declare global { interface Window { gameDraws: number; gameContexts: number } }

async function instrument(page: Page) {
  await page.addInitScript(() => {
    window.gameDraws = 0
    window.gameContexts = 0
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

for (const game of GAMES) test(`${game.id}: production rendering, idle and interaction`, async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await instrument(page)
  await page.goto(`/${game.id}/?lang=en`)
  await expect(page.locator('.game-fps')).toHaveCount(1)
  await expect(page.locator('.game-fps')).toBeVisible()
  await expect(page.locator('.desktop-game')).toHaveCount(0)
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
  expect(errors).toEqual([])
})
