import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createStudio } from '../src/scene/createStudio.js'
import { LEVELS } from '../src/levels.js'
import { footprint } from '../src/bricks.js'

class Events {
  listeners = new Map()
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(fn)
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn)
  }
  emit(type, event = {}) {
    for (const fn of this.listeners.get(type) || []) fn(event)
  }
  get listenerCount() {
    return [...this.listeners.values()].reduce(
      (count, list) => count + list.size,
      0
    )
  }
}
class Surface extends Events {
  style = {}
  attributes = {}
  children = []
  width = 800
  height = 500
  setAttribute(key, value) {
    this.attributes[key] = value
  }
  getBoundingClientRect() {
    return { width: this.width, height: this.height, left: 0, top: 0 }
  }
  getClientRects() {
    return [this.getBoundingClientRect()]
  }
  prepend(child) {
    this.children.unshift(child)
  }
  append(child) {
    this.children.push(child)
  }
  remove() {
    this.removed = true
  }
}
class Renderer {
  static instances = []
  constructor() {
    Renderer.instances.push(this)
  }
  domElement = new Surface()
  shadowMap = {}
  info = { render: { calls: 0, triangles: 0 }, memory: { geometries: 0 } }
  setPixelRatio() {}
  setClearColor() {}
  setSize(width, height) {
    this.domElement.width = width
    this.domElement.height = height
  }
  render(scene, camera) {
    this.scene = scene
    this.camera = camera
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld(true)
    scene.traverse(object => {
      if (object.geometry) {
        const vertices = object.geometry.getAttribute('position')?.array || []
        assert.ok(
          vertices.every(Number.isFinite),
          'geometry coordinates are finite'
        )
      }
    })
    this.info.render.calls++
  }
  dispose() {
    this.disposed = true
  }
}
class Controls extends Events {
  static instances = []
  constructor(camera) {
    super()
    Controls.instances.push(this)
    this.camera = camera
  }
  target = new THREE.Vector3()
  mouseButtons = {}
  update() {
    this.camera.lookAt(this.target)
    this.camera.updateMatrixWorld()
  }
  dispose() {
    this.listeners.clear()
  }
}

function environment(t) {
  let clock = 0
  t.mock.method(performance, 'now', () => clock)
  const window = new Events(),
    document = new Events()
  window.devicePixelRatio = 1
  document.hidden = false
  const motion = new Events()
  motion.matches = true
  const frames = new Map()
  let id = 0
  for (const [key, value] of Object.entries({
    window,
    document,
    matchMedia: () => motion,
    requestAnimationFrame: fn => {
      frames.set(++id, fn)
      return id
    },
    cancelAnimationFrame: key => frames.delete(key),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key)
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    })
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous)
      else delete globalThis[key]
    })
  }
  Renderer.instances = []
  Controls.instances = []
  return {
    window,
    document,
    motion,
    frames,
    frame(now = clock + 1000 / 30) {
      clock = now
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach(fn => fn(now))
    },
  }
}

test('Three.js scene builds all models and disposes resources/listeners on unmount', t => {
  const env = environment(t)
  const studio = createStudio(
    {
      mainEl: new Surface(),
      referenceEl: new Surface(),
      labels: { workspace: 'Workspace', reference: 'Blueprint' },
    },
    { Renderer, Controls }
  )
  for (const level of LEVELS) {
    studio.setBuild(level.bricks)
    studio.setTarget(level.bricks)
    studio.setGuides(level.bricks)
    studio.setHint([level.bricks[0]])
    studio.setMissing([level.bricks[0]])
    studio.setCompare(true, new Set())
    studio.setPeel(3)
    env.frame()
    assert.equal(studio.getStats().bricks, level.bricks.length)
  }
  studio.setLabels({ workspace: 'Podložka', reference: 'Predloha' })
  assert.equal(
    Renderer.instances[0].domElement.attributes['aria-label'],
    'Podložka'
  )
  studio.dispose()
  studio.dispose()
  assert.equal(env.frames.size, 0)
  assert.equal(env.window.listenerCount, 0)
  assert.equal(env.document.listenerCount, 0)
  for (const renderer of Renderer.instances) {
    assert.equal(renderer.disposed, true)
    assert.equal(renderer.domElement.removed, true)
    assert.equal(renderer.domElement.listenerCount, 0)
  }
})

test('idle studios sleep and wake for edits, both cameras, resize and visibility', t => {
  const env = environment(t)
  const mainEl = new Surface()
  const studio = createStudio(
    { mainEl, referenceEl: new Surface(), labels: {} },
    { Renderer, Controls }
  )
  const [main, reference] = Renderer.instances
  env.frame()
  assert.equal(env.frames.size, 0)
  env.frame()
  assert.equal(main.info.render.calls, 1)
  assert.equal(reference.info.render.calls, 1)

  studio.setBuild(LEVELS[0].bricks)
  studio.setTarget(LEVELS[0].bricks)
  assert.equal(env.frames.size, 1, 'batch scene edits into one frame')
  env.frame()
  assert.equal(main.info.render.calls, 2)
  assert.equal(reference.info.render.calls, 2)
  assert.equal(env.frames.size, 0)

  for (const controls of Controls.instances) {
    controls.camera.position.x += 1
    controls.emit('change')
    assert.equal(env.frames.size, 1, 'either orbit camera wakes rendering')
    env.frame()
    assert.equal(env.frames.size, 0)
  }
  mainEl.width = 400
  studio.resize()
  assert.equal(env.frames.size, 1)
  env.frame()
  assert.equal(main.domElement.width, 400)

  env.document.hidden = true
  env.document.emit('visibilitychange')
  studio.setBuild([])
  assert.equal(env.frames.size, 0, 'hidden scenes do not render')
  env.document.hidden = false
  env.document.emit('visibilitychange')
  assert.equal(env.frames.size, 1)
  env.frame()
  assert.equal(env.frames.size, 0)
  studio.dispose()
  assert.equal(env.motion.listenerCount, 0)
})

test('hints and camera animations render until settled and respect reduced motion', t => {
  const env = environment(t)
  const studio = createStudio(
    { mainEl: new Surface(), referenceEl: new Surface(), labels: {} },
    { Renderer, Controls }
  )
  studio.setHint([LEVELS[0].bricks[0]])
  env.frame()
  assert.equal(env.frames.size, 0, 'reduced-motion hints stay static')
  env.motion.matches = false
  env.motion.emit('change')
  const [main, reference] = Renderer.instances
  const mainFrames = main.info.render.calls
  const referenceFrames = reference.info.render.calls
  const hintStart = performance.now()
  for (let i = 0; i < 60; i++) env.frame(hintStart + i * 1000 / 60)
  assert.equal(main.info.render.calls - mainFrames, 60, 'hint animation stays smooth at 60 FPS')
  assert.equal(reference.info.render.calls, referenceFrames, 'a pulsing hint never redraws the unchanged blueprint')
  studio.setPeel(2)
  env.frame()
  assert.equal(reference.info.render.calls, referenceFrames + 1, 'peeling the blueprint redraws it')
  assert.equal(env.frames.size, 1, 'animated hints keep drawing')
  studio.setHint([])
  env.frame()
  assert.equal(env.frames.size, 0)

  studio.view('top')
  env.frame()
  assert.equal(env.frames.size, 1)
  env.frame(performance.now() + 600)
  assert.equal(env.frames.size, 0, 'completed camera tween sleeps')
  studio.celebrate()
  env.frame()
  assert.equal(env.frames.size, 1)
  env.frame(performance.now() + 5100)
  assert.equal(env.frames.size, 0, 'completed celebration sleeps')
  studio.dispose()
})

test('raycasting places bricks, while multi-touch and pointer cancellation never place one', t => {
  const env = environment(t)
  const placed = []
  const brick = { type: 'b22', color: 'blue', x: 10, y: 0, z: 10, rot: 0 }
  const studio = createStudio(
    {
      mainEl: new Surface(),
      referenceEl: new Surface(),
      labels: { workspace: 'Workspace', reference: 'Blueprint' },
      getSelection: () => brick,
      isBuilding: () => true,
      onPlace: value => placed.push(value),
    },
    { Renderer, Controls }
  )
  studio.frame(true)
  const canvas = Renderer.instances[0].domElement
  const point = studio.projectBrick(brick)
  const event = id => ({
    clientX: point.x,
    clientY: point.y,
    pointerId: id,
    pointerType: 'touch',
    button: 0,
    target: canvas,
  })
  canvas.emit('pointerdown', event(1))
  env.window.emit('pointerup', event(1))
  assert.deepEqual(placed, [brick])
  canvas.emit('pointerdown', event(1))
  canvas.emit('pointerdown', event(2))
  env.window.emit('pointerup', event(2))
  canvas.emit('pointerdown', event(2))
  env.window.emit('pointerup', event(2))
  env.window.emit('pointerup', event(1))
  assert.equal(placed.length, 1, 'two fingers remain a camera gesture')
  canvas.emit('pointerdown', event(1))
  env.window.emit('pointercancel', event(1))
  env.window.emit('pointerup', event(1))
  assert.equal(placed.length, 1)
  studio.dispose()
})

test('failure to create the second WebGL context cleans up the first', t => {
  environment(t)
  class FailingRenderer extends Renderer {
    constructor() {
      if (Renderer.instances.length) throw Error('No second context')
      super()
    }
  }
  assert.throws(
    () =>
      createStudio(
        { mainEl: new Surface(), referenceEl: new Surface(), labels: {} },
        { Renderer: FailingRenderer, Controls }
      ),
    /second context/
  )
  assert.equal(Renderer.instances[0].disposed, true)
  assert.equal(Renderer.instances[0].domElement.removed, true)
})

test('blueprint resize keeps models in view across phone, tablet and expanded proportions', t => {
  const env = environment(t)
  const mainEl = new Surface(),
    referenceEl = new Surface()
  const studio = createStudio(
    { mainEl, referenceEl, labels: {} },
    { Renderer, Controls }
  )
  for (const level of LEVELS) {
    referenceEl.width = 280
    referenceEl.height = 260
    studio.resize()
    studio.setTarget(level.bricks)
    for (const [width, height] of [
      [148, 88],
      [358, 600],
      [820, 260],
      [1040, 710],
      [280, 260],
    ]) {
      referenceEl.width = width
      referenceEl.height = height
      studio.resize()
      env.frame()
      const { camera, domElement } = Renderer.instances[1]
      assert.equal(camera.aspect, width / height)
      assert.equal(domElement.width, width)
      assert.equal(domElement.height, height)
      for (const b of level.bricks) {
        const f = footprint(b)
        for (const x of [b.x, b.x + f.w])
          for (const z of [b.z, b.z + f.d]) {
            for (const y of [b.y * 0.4, (b.y + f.h) * 0.4 + 0.2]) {
              const point = new THREE.Vector3(x - 12, y, z - 12).project(camera)
              assert.ok(
                Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
                `${level.id} remains visible at ${width} × ${height}`
              )
            }
          }
      }
    }
    studio.referenceFrame()
  }
  studio.dispose()
})

test('the board remains framed after resizing an existing workspace into portrait', t => {
  const env = environment(t)
  const mainEl = new Surface(),
    referenceEl = new Surface()
  const studio = createStudio(
    { mainEl, referenceEl, labels: {} },
    { Renderer, Controls }
  )
  studio.frame(true)
  for (const [width, height] of [
    [304, 240],
    [374, 380],
    [400, 760],
    [820, 320],
  ]) {
    mainEl.width = width
    mainEl.height = height
    studio.resize()
    env.frame()
    for (const x of [0, 23])
      for (const z of [0, 23]) {
        const point = studio.projectBrick({
          type: 'b11',
          color: 'blue',
          x,
          z,
          y: 0,
          rot: 0,
        })
        assert.ok(
          point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height,
          `board corner remains visible at ${width} × ${height}`
        )
      }
  }
  studio.dispose()
})
