import test from 'node:test'
import assert from 'node:assert/strict'
import { renderBudget, renderPixelRatio, renderScale } from '../shared/render-budget.js'
import { createRenderLoop } from '../shared/render-loop.js'

function environment(t) {
  const frames = new Map(), listeners = new Set()
  let id = 0
  const document = {
    hidden: false,
    addEventListener: (_name, callback) => listeners.add(callback),
    removeEventListener: (_name, callback) => listeners.delete(callback),
  }
  for (const [key, value] of Object.entries({
    document,
    requestAnimationFrame: callback => { frames.set(++id, callback); return id },
    cancelAnimationFrame: key => frames.delete(key),
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original)
      else delete globalThis[key]
    })
  }
  return {
    frames, listeners,
    frame(now) {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach(callback => callback(now))
    },
    hide(hidden) { document.hidden = hidden; listeners.forEach(callback => callback()) },
  }
}

test('all viewport sizes share a bounded render buffer with inverse Babylon/Three scales', () => {
  for (const [w, h] of [[0, 0], [390, 608], [1440, 900], [1920, 1080], [3840, 2160]]) {
    for (const dpr of [0, 1, 2, 3]) {
      const ratio = renderPixelRatio(w, h, dpr)
      assert.ok(Number.isFinite(ratio) && ratio > 0)
      assert.ok(ratio <= renderBudget.density)
      assert.ok(w * h * ratio ** 2 <= renderBudget.pixels + 1)
      assert.equal(renderScale(w, h, dpr), 1 / ratio)
    }
  }
})

for (const hz of [60, 120, 144]) test(`animations stay at 60 FPS on a ${hz} Hz display without slowing the clock`, t => {
  const env = environment(t)
  let draws = 0, seconds = 0
  const loop = createRenderLoop((_now, delta) => { draws++; seconds += delta; return true })
  loop.request()
  for (let i = 0; i < hz; i++) env.frame(i * 1000 / hz)
  assert.equal(draws, 60)
  assert.ok(seconds > .94 && seconds < 1)
  loop.dispose()
  assert.equal(env.frames.size, 0)
})

test('static scenes coalesce changes, sleep, and do not accumulate idle time', t => {
  const env = environment(t), deltas = []
  const loop = createRenderLoop((_now, delta) => { deltas.push(delta) })
  loop.request(); loop.request()
  assert.equal(env.frames.size, 1)
  env.frame(0)
  assert.equal(env.frames.size, 0)
  assert.equal(loop.active, false)
  loop.request(); env.frame(60_000)
  assert.deepEqual(deltas, [0, 0])
  loop.dispose()
})

test('visibility cancels animation work, resets simulation time and cleans up listeners', t => {
  const env = environment(t), deltas = []
  const loop = createRenderLoop((_now, delta) => { deltas.push(delta); return true })
  loop.request(); env.frame(0); env.frame(40)
  env.hide(true); loop.request()
  assert.equal(env.frames.size, 0)
  env.hide(false); env.frame(60_000)
  assert.deepEqual(deltas, [0, .04, 0])
  loop.dispose(); loop.request(); env.hide(false)
  assert.equal(env.frames.size, 0)
  assert.equal(env.listeners.size, 0)
})
