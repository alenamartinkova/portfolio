import test from 'node:test'
import assert from 'node:assert/strict'
import { renderAntialiasing } from '../shared/render-budget.js'
import { createCachedRaycast } from '../shared/cached-raycast.js'

test('antialiasing selects exactly one supported path', () => {
  for (const supported of [0, 1, 2, 4, 8]) {
    const quality = renderAntialiasing(supported)
    assert.equal(quality.fxaa, quality.samples === 1)
    assert.ok(quality.samples <= Math.max(1, supported))
  }
})

test('static picking caches identical rays and detects in-place mutations', () => {
  let count = 0
  const pick = createCachedRaycast(() => ++count)
  const ray = { origin: { x: 0, y: 0, z: 0 }, direction: { x: 0, y: 0, z: 1 }, length: 5 }
  assert.equal(pick(ray), 1)
  assert.equal(pick(ray), 1)
  ray.origin.x = 1
  assert.equal(pick(ray), 2)
  ray.direction.y = .5
  assert.equal(pick(ray), 3)
  ray.length = 8
  assert.equal(pick(ray), 4)
})
