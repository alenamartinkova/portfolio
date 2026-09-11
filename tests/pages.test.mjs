import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { GAMES } from '../games/catalog.js'
import { MORE } from '../src/motion/projects.js'

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
    for (const section of ['about', 'stack', 'work', 'career', 'contact']) {
      assert.ok(html.includes(`id="${section}"`), `Missing section: ${section}`)
    }
    assert.equal((html.match(new RegExp(`href="/games/\\?lang=${locale}"`, 'g')) || []).length, 2)
    assert.ok(!html.match(/<nav\b[\s\S]*?<\/nav>/)?.[0].includes('/games/'))
    assert.ok(html.includes(locale === 'sk' ? 'Od nápadu.' : 'From an idea.'))
    assert.ok(html.includes('class="m-about-opening"'))
    assert.ok(html.includes('id="client-work-grid"'))
    for (const project of MORE) assert.ok(html.includes(project.link), `Project missing from HTML: ${project.name}`)
    assert.ok(!html.includes('data-ready='), 'Scroll effects must not hide the static HTML')
    assert.match(html, new RegExp(`class="m-locale" href="${locale === 'sk' ? '/' : '/sk/'}"`))
    assert.ok(!html.includes('Pôvodné portfólio'))
    assert.ok(!html.includes('Original portfolio'))
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
