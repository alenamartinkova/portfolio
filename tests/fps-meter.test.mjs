import test from 'node:test'
import assert from 'node:assert/strict'
import { createFpsCounter } from '../shared/fps-meter.js'

test('FPS uses elapsed wall time and reaches zero when no scene renders', () => {
  let now = 0
  const meter = createFpsCounter(() => now)
  for (let i = 0; i < 60; i++) meter.frame()
  now = 1000
  assert.equal(meter.read(), 60)
  for (let i = 0; i < 30; i++) meter.frame()
  now = 2500
  assert.equal(meter.read(), 20, 'delayed timers must not inflate FPS')
  now = 3500
  assert.equal(meter.read(), 0)
  meter.frame()
  meter.reset()
  now = 4500
  assert.equal(meter.read(), 0, 'hidden/resumed windows discard old frames')
})
