import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { initialState, gameReducer } from '../src/game/state.js'
import { LEVELS } from '../src/game/models.js'

let server, Provider, Collection, GameHeader, GameDialog, Workspace
before(async () => {
  // Compile the real JSX with the project's Vite config; no browser or server port.
  server = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    appType: 'custom',
    cacheDir: 'node_modules/.vite-tests',
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  ;({ GameLocaleProvider: Provider } = await server.ssrLoadModule(
    '/src/game/i18n/index.jsx'
  ))
  ;({ default: Collection } = await server.ssrLoadModule(
    '/src/game/components/Collection.jsx'
  ))
  ;({ default: GameHeader } = await server.ssrLoadModule(
    '/src/game/components/GameHeader.jsx'
  ))
  ;({ default: GameDialog } = await server.ssrLoadModule(
    '/src/game/components/GameDialog.jsx'
  ))
  ;({ default: Workspace } = await server.ssrLoadModule(
    '/src/game/components/Workspace.jsx'
  ))
})
after(async () => {
  await server?.close()
})
const render = (locale, Component, state) =>
  renderToStaticMarkup(
    createElement(
      Provider,
      { initialLocale: locale },
      createElement(Component, { state, dispatch() {}, onReady() {} })
    )
  )

test('React collection renders both locales with all models, without mutating their data', () => {
  const names = LEVELS.map(level => level.name)
  const state = initialState()
  const english = render('en', Collection, state),
    slovak = render('sk', Collection, state)
  assert.equal((english.match(/class="game-model-card"/g) || []).length, 12)
  assert.equal((slovak.match(/class="game-model-card"/g) || []).length, 12)
  assert.ok(english.includes('What will you build today?'))
  assert.ok(slovak.includes('Čo si dnes poskladáte?'))
  assert.ok(slovak.includes('Parná lokomotíva'))
  assert.deepEqual(
    LEVELS.map(level => level.name),
    names
  )
  assert.ok(!english.includes('<canvas'))
})

test('React header preserves the locale when returning to the portfolio', () => {
  assert.ok(
    render('sk', GameHeader, initialState()).includes('href="/sk/#about"')
  )
  assert.ok(render('en', GameHeader, initialState()).includes('href="/#about"'))
})

test('workspace renders actual palette, blueprint and accessible progress in Slovak', () => {
  const state = gameReducer(initialState(), { type: 'start', levelId: 'tower' })
  const markup = render('sk', Workspace, state)
  assert.ok(markup.includes('role="progressbar"'))
  assert.ok(markup.includes('aria-valuenow="0"'))
  assert.ok(markup.includes('Vaše kocky'))
  assert.ok(markup.includes('Odkryť vrstvy'))
  assert.ok(markup.includes('Krok 1 / 11'))
  assert.ok(markup.includes('aria-label="Zväčšiť predlohu"'))
  assert.ok(markup.includes('>Zväčšiť</span>'))
  assert.ok(markup.includes('aria-expanded="false"'))
  assert.ok(!markup.includes('innerHTML'))
  const placed = gameReducer(state, {
    type: 'place',
    brick: { ...LEVELS[0].bricks[0], x: 0, z: 0 },
  })
  assert.ok(render('sk', Workspace, placed).includes('Krok 2 / 11'))
})

test('save and help dialogs render native dialogs with translated content', () => {
  const state = gameReducer(initialState(), {
    type: 'start',
    levelId: 'sandbox',
  })
  const saved = gameReducer(state, { type: 'saveSlot', index: 0, date: 123 })
  const markup = render('sk', GameDialog, { ...saved, dialog: 'saves' })
  assert.ok(markup.includes('<dialog'))
  assert.ok(markup.includes('Polička 3'))
  assert.ok(markup.includes('Uložiť sem'))
  const help = render('en', GameDialog, { ...state, dialog: 'help' })
  assert.ok(help.includes('aria-labelledby='))
  assert.ok(help.includes('two fingers'))
})
