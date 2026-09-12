import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { GAMES } from '../games/catalog.js'

const build = new URL('../build/', import.meta.url)
const chunks = JSON.parse(await readFile(new URL('.vite/game-bundles.json', build), 'utf8'))
const engine = /node_modules\/.*(?:three|@babylonjs)[/@+]/
const rows = []
for (const id of ['games', ...GAMES.map(game => game.id)]) {
  const html = await readFile(new URL(`${id}/index.html`, build), 'utf8')
  const entries = [...html.matchAll(/<script[^>]+src="\/([^"?]+\.js)"/g)].map(match => match[1])
  assert.ok(entries.length, `${id}: production entry must exist`)
  const loaded = new Set()
  function visit(file) {
    if (loaded.has(file)) return
    assert.ok(chunks[file] || existsSync(new URL(file, build)), `${id}: missing script ${file}`)
    loaded.add(file)
    chunks[file]?.imports.forEach(visit)
  }
  entries.forEach(visit)
  const modules = [...loaded].flatMap(file => chunks[file]?.modules ?? [])
  // The catalog and Brick Break collection must not preload a renderer.
  if (id === 'games' || id === 'lego') assert.ok(!modules.some(module => engine.test(module)), `${id}: engine leaked into first paint`)
  for (const other of GAMES) {
    if (other.id === id) continue
    assert.ok(!modules.some(module => module.startsWith(`games/${other.id}/src/`)), `${id}: eagerly imports ${other.id}`)
  }
  if (id !== 'games' && id !== 'lego') {
    const gameplay = new Set()
    function visitGameplay(file) {
      if (gameplay.has(file)) return
      gameplay.add(file)
      for (const dependency of [...chunks[file]?.imports ?? [], ...chunks[file]?.dynamicImports ?? []]) visitGameplay(dependency)
    }
    entries.forEach(visitGameplay)
    assert.ok(![...gameplay].some(file => chunks[file]?.modules.some(module => /node_modules\/.*\/(?:react|react-dom)(?:\/|@)/.test(module))), `${id}: React leaked through a shared runtime chunk`)
  }
  let raw = 0, gzip = 0
  for (const file of loaded) {
    const source = await readFile(new URL(file, build))
    raw += source.length; gzip += gzipSync(source).length
  }
  assert.ok(gzip < (id === 'games' ? 100_000 : id === 'lego' ? 110_000 : 60_000), `${id}: lightweight entry exceeded its gzip budget (${gzip} bytes)`)
  rows.push({ route: `/${id}/`, initialJSBytes: raw, initialGzipBytes: gzip, chunks: loaded.size })
}
const assets = await readdir(new URL('assets/', build))
assert.equal(assets.filter(file => file.endsWith('.wasm')).length, 1, 'Havok must have one shared URL')
assert.equal(assets.filter(file => file.endsWith('.woff2')).length, 0, 'Fonts must use canonical /fonts/ URLs')
const index = await readFile(new URL('games/index.html', build), 'utf8')
for (const game of GAMES) assert.ok(index.includes(game.title), `${game.title} missing from prerendered index`)
console.table(rows)
console.log('Game entry budgets, route isolation, shared WASM/fonts and prerendered index: OK')
