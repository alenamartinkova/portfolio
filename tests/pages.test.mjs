import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { GAMES } from '../games/catalog.js'

let server, renderPortfolio, GamesApp

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ render: renderPortfolio } = await server.ssrLoadModule('/src/entry-server.jsx'))
  ;({ default: GamesApp } = await server.ssrLoadModule('/src/games/GamesApp.jsx'))
})

after(async () => { await server?.close() })

for (const locale of ['en', 'sk']) {
  test(`portfolio prerender keeps its content and game links in ${locale}`, () => {
    const html = renderPortfolio(locale)
    for (const section of ['about', 'skills', 'projects', 'journey', 'contact']) {
      assert.ok(html.includes(`id="${section}"`), `Missing section: ${section}`)
    }
    assert.ok(html.includes(`/games/?lang=${locale}`))
    assert.ok(html.includes(locale === 'sk' ? '/lego/?lang=sk' : '/lego/'))
  })

  test(`game list renders every registered game with localized links in ${locale}`, () => {
    const html = renderToStaticMarkup(createElement(GamesApp, { ssrLocale: locale }))
    assert.equal((html.match(/class="games-card"/g) || []).length, GAMES.length)
    for (const game of GAMES) {
      assert.ok(html.includes(`href="/${game.id}/?lang=${locale}"`))
      assert.ok(html.includes(`id="${game.id}-description"`))
      assert.ok(html.includes(game.title))
    }
    assert.ok(html.includes(`href="${locale === 'sk' ? '/sk/' : '/'}"`))
  })
}
