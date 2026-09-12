import test from 'node:test'
import assert from 'node:assert/strict'
import { constructScene, finishConstruction, prepareSceneMaterials, yieldConstruction } from '../shared/scene-construction.js'

test('construction preserves order and return values while yielding only at its budget', async () => {
  let clock = 0, yields = 0
  const visited = []
  function* build() {
    for (let i = 0; i < 12; i++) { visited.push(i); clock += 2; yield }
    return 'complete'
  }
  assert.equal(await constructScene(build(), {
    now: () => clock, budgetMs: 8, yieldTask: async () => { yields++ },
  }), 'complete')
  assert.equal(yields, 3)
  assert.deepEqual(visited, Array.from({ length: 12 }, (_, i) => i))
  visited.length = 0
  assert.equal(finishConstruction(build()), 'complete')
  assert.equal(visited.length, 12)
})

test('cancellation after a browser task closes nested builders before any further allocation', async () => {
  let cancelled = false, allocations = 0, closed = false
  function* nested() {
    try { while (true) { allocations++; yield } }
    finally { closed = true }
  }
  function* build() { yield* nested() }
  await assert.rejects(constructScene(build(), {
    budgetMs: 0, isCancelled: () => cancelled,
    yieldTask: async () => { cancelled = true },
  }), { name: 'AbortError' })
  assert.equal(allocations, 1)
  assert.equal(closed, true)
})

test('a cancelled construction never enters the builder; thrown failures close it', async () => {
  let entered = false, closed = false
  function* build() {
    entered = true
    try { yield; throw new Error('asset failure') }
    finally { closed = true }
  }
  await assert.rejects(constructScene(build(), { isCancelled: () => true }), { name: 'AbortError' })
  assert.equal(entered, false)
  await assert.rejects(constructScene(build()), /asset failure/)
  assert.equal(closed, true)
})

test('construction yields to a real event-loop task, not only a promise microtask', async () => {
  let resumed = false
  const pending = yieldConstruction().then(() => { resumed = true })
  await Promise.resolve()
  assert.equal(resumed, false)
  await pending
  assert.equal(resumed, true)
})

test('material preparation uses the camera pass and restores it before yielding or failing', async () => {
  const engine = { currentRenderPassId: 7 }
  let prepared = 0
  const scene = { getEngine: () => engine, activeCamera: { renderPassId: 3 }, meshes: [
    { subMeshes: [], isReady() { throw new Error('empty mesh') } },
    { subMeshes: [{}], isReady(complete) { assert.equal(complete, true); assert.equal(engine.currentRenderPassId, 3); prepared++ } },
    { subMeshes: [{}], isReady() { throw new Error('shader error') } },
  ] }
  await assert.rejects(constructScene(prepareSceneMaterials(scene), {
    budgetMs: 0, yieldTask: async () => { assert.equal(engine.currentRenderPassId, 7) },
  }), /shader error/)
  assert.equal(prepared, 1)
  assert.equal(engine.currentRenderPassId, 7)
})
