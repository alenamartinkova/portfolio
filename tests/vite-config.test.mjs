import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveConfig } from 'vite'
import { GAMES } from '../games/catalog.js'

test('preview serves the build without inheriting the game development proxies', async () => {
  const config = await resolveConfig({}, 'serve', 'production', 'production', true)

  assert.deepEqual(config.preview.proxy, {})
  for (const { id, port } of GAMES) {
    assert.equal(config.server.proxy[`/${id}/`].target, `http://127.0.0.1:${port}`)
  }
})
