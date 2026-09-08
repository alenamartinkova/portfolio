import test from 'node:test'
import assert from 'node:assert/strict'
import { LEVELS } from '../src/levels.js'
import {
  TYPES,
  COLOURS,
  validateModel,
  validatePlacement,
  brickKey,
  footprint,
} from '../src/bricks.js'
import { matchModel } from '../src/matching.js'
import {
  gameReducer,
  initialState,
  initializeGame,
  progressFor,
  remaining,
} from '../src/state.js'
import {
  encodeBuild,
  decodeBuild,
  readSaved,
  writeSaved,
  savedFromState,
  STORAGE_KEY,
  DIFFICULTIES,
} from '../src/persistence.js'
import en from '../src/i18n/en.js'
import sk from '../src/i18n/sk.js'

function controller(saved = null, mode) {
  let state = initializeGame(saved, mode)
  return {
    get state() {
      return state
    },
    send(action) {
      state = gameReducer(state, action)
      return state
    },
  }
}
const bottom = { type: 'b22', color: 'blue', x: 10, z: 10, y: 0, rot: 0 }
const top = { ...bottom, y: 3 }

test('all 12 original models remain valid and complete at all three difficulties', () => {
  assert.equal(LEVELS.length, 12)
  assert.equal(
    LEVELS.reduce((count, level) => count + level.bricks.length, 0),
    555
  )
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const game = controller()
    game.send({ type: 'difficulty', value: difficulty })
    for (const model of LEVELS) {
      assert.equal(validateModel(model.bricks).ok, true, model.id)
      game.send({ type: 'start', levelId: model.id })
      for (const brick of model.bricks) game.send({ type: 'place', brick })
      assert.deepEqual(
        game.state.result,
        { stars: 3 },
        `${difficulty}/${model.id}`
      )
      assert.equal(game.state.saved.progress[model.id][difficulty], 3)
      assert.equal(progressFor(game.state).missing.length, 0)
      game.send({ type: 'next' })
      assert.equal(
        game.state.screen,
        model === LEVELS.at(-1) ? 'collection' : 'build'
      )
    }
  }
})

test('support, collision and undo/redo preserve valid builds without mutating old state', () => {
  const game = controller(null, 'sandbox')
  const original = game.state
  game.send({ type: 'place', brick: top })
  assert.equal(game.state.bricks.length, 0)
  assert.equal(game.state.notice.key, 'needs support')
  game.send({ type: 'place', brick: bottom })
  assert.equal(original.bricks.length, 0)
  game.send({ type: 'place', brick: bottom })
  assert.equal(game.state.bricks.length, 1)
  game.send({ type: 'place', brick: top })
  game.send({ type: 'remove', brick: bottom })
  assert.equal(game.state.notice.key, 'supportsOther')
  assert.equal(game.state.bricks.length, 2)
  game.send({ type: 'undo' })
  assert.deepEqual(game.state.bricks, [bottom])
  game.send({ type: 'redo' })
  assert.deepEqual(game.state.bricks, [bottom, top])
  game.send({ type: 'remove', brick: top })
  game.send({ type: 'remove', brick: bottom })
  assert.deepEqual(game.state.bricks, [])
})

test('every model completes at each corner of the plate without position penalties', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (const model of LEVELS) {
      const minX = Math.min(...model.bricks.map(b => b.x))
      const minZ = Math.min(...model.bricks.map(b => b.z))
      const maxX = Math.max(...model.bricks.map(b => b.x + footprint(b).w))
      const maxZ = Math.max(...model.bricks.map(b => b.z + footprint(b).d))
      for (const dx of [-minX, 24 - maxX]) {
        for (const dz of [-minZ, 24 - maxZ]) {
          const game = controller()
          game.send({ type: 'difficulty', value: difficulty })
          game.send({ type: 'start', levelId: model.id })
          for (const brick of model.bricks) {
            game.send({
              type: 'place',
              brick: { ...brick, x: brick.x + dx, z: brick.z + dz },
            })
          }
          const label = `${model.id}/${difficulty}/${dx},${dz}`
          assert.equal(game.state.mistakes, 0, label)
          assert.deepEqual(game.state.result, { stars: 3 }, label)
          assert.equal(progressFor(game.state).missing.length, 0, label)
        }
      }
    }
  }
})

test('translated progress, guide steps, hints and comparisons share actual build coordinates', () => {
  const game = controller(null, 'quick')
  const model = LEVELS[0]
  const moved = model.bricks.map(b => ({ ...b, x: b.x - 10, z: b.z + 10 }))
  game.send({ type: 'place', brick: moved[0] })
  let progress = progressFor(game.state)
  assert.deepEqual(progress.offset, { x: -10, z: 10 })
  assert.deepEqual(progress.missing, moved.slice(1))
  assert.deepEqual([...progress.correct], [brickKey(moved[0])])
  assert.equal(progress.missingIndices[0], 1)
  game.send({ type: 'hint' })
  assert.deepEqual(game.state.hintBrick, moved[1])
  game.send({ type: 'place', brick: moved[1] })
  assert.equal(game.state.hintBrick, null)
  game.send({ type: 'undo' })
  assert.deepEqual(progressFor(game.state), progress)
  game.send({ type: 'redo' })
  const restored = controller(savedFromState(game.state), 'quick')
  assert.deepEqual(restored.state.bricks, moved.slice(0, 2))
  assert.deepEqual(progressFor(restored.state).missing, moved.slice(2))
  for (const brick of moved.slice(2)) restored.send({ type: 'place', brick })
  assert.deepEqual(restored.state.result, { stars: 3 })
})

test('one common translation still rejects wrong shapes, colours, heights and relative positions', () => {
  const model = LEVELS[0]
  for (const change of [
    { x: 12 },
    { color: 'white' },
    { type: 'b12' },
    { y: 2 },
  ]) {
    const build = model.bricks.map((b, i) =>
      i === 1 ? { ...b, ...change } : b
    )
    assert.equal(
      matchModel(model.bricks, build).correct.size,
      model.bricks.length - 1
    )
  }
  const first = { type: 'b11', color: 'blue', x: 10, z: 10, y: 0, rot: 0 }
  const reference = [first, { ...first, x: 13 }]
  const scattered = [
    { ...first, x: 0 },
    { ...first, x: 23 },
  ]
  assert.equal(matchModel(reference, scattered).correct.size, 1)
  const slope = { ...first, type: 's22' }
  assert.equal(matchModel([slope], [{ ...slope, rot: 2 }]).correct.size, 0)
  const rectangle = { ...first, type: 'b12' }
  assert.equal(
    matchModel([rectangle], [{ ...rectangle, rot: 1 }]).correct.size,
    0
  )
  assert.equal(
    matchModel([rectangle], [{ ...rectangle, x: 0, rot: 2 }]).correct.size,
    1
  )
})

test('extra pieces prevent completion and a misplaced relative part still counts as a mistake', () => {
  const game = controller(null, 'quick')
  const model = LEVELS[0]
  for (const brick of model.bricks.slice(0, -1))
    game.send({ type: 'place', brick })
  const wrong = { ...model.bricks.at(-1), x: 12 }
  game.send({ type: 'place', brick: wrong })
  assert.equal(game.state.mistakes, 1)
  assert.equal(game.state.result, null)
  game.send({ type: 'place', brick: model.bricks.at(-1) })
  assert.equal(progressFor(game.state).correct.size, model.bricks.length)
  assert.equal(game.state.result, null, 'the spare part must be removed')
  game.send({ type: 'remove', brick: wrong })
  assert.deepEqual(game.state.result, { stars: 3 })
})

test('build codes round-trip every model and reject invalid data', () => {
  for (const level of LEVELS)
    assert.deepEqual(decodeBuild(encodeBuild(level.bricks)), level.bricks)
  for (const code of [
    'bad',
    'BS1.!',
    'BS1.' + btoa('{}'),
    'BS1.' + btoa('[[0,0,0,0,3,0]]'),
    'BS1.' + btoa('[[0,0,24,0,0,0]]'),
    'BS1.' + btoa('[[0,0,0,0,0,4]]'),
  ])
    assert.throws(() => decodeBuild(code))
  const game = controller(null, 'sandbox')
  game.send({ type: 'place', brick: bottom })
  game.send({ type: 'import', code: 'invalid' })
  assert.deepEqual(game.state.bricks, [bottom])
  game.send({ type: 'import', code: encodeBuild(LEVELS[4].bricks) })
  assert.deepEqual(game.state.bricks, LEVELS[4].bricks)
  game.send({ type: 'undo' })
  assert.deepEqual(game.state.bricks, [bottom])
})

test('legacy local saves, three slots and in-progress sandbox drafts remain compatible', () => {
  const values = new Map()
  const storage = {
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
  }
  const game = controller(null, 'sandbox')
  game.send({ type: 'place', brick: bottom })
  game.send({ type: 'saveSlot', index: 1, date: 123 })
  assert.equal(writeSaved(storage, savedFromState(game.state)), true)
  assert.ok(values.has('bricksmith.studio.v1'))
  const restored = controller(readSaved(storage), 'sandbox')
  assert.deepEqual(restored.state.bricks, [bottom])
  assert.equal(restored.state.saved.slots[1].code, encodeBuild([bottom]))
  restored.send({ type: 'clear' })
  assert.equal(savedFromState(restored.state).draft, null)
  assert.ok(restored.state.saved.slots[1])
  restored.send({ type: 'loadSlot', index: 1 })
  assert.deepEqual(restored.state.bricks, [bottom])
  restored.send({ type: 'undo' })
  assert.deepEqual(restored.state.bricks, [])
})

test('returning to collection or changing its difficulty never rewrites a draft difficulty', () => {
  const game = controller()
  game.send({ type: 'difficulty', value: 'hard' })
  game.send({ type: 'start', levelId: 'tower' })
  game.send({ type: 'dialog', dialog: null })
  game.send({ type: 'place', brick: LEVELS[0].bricks[0] })
  game.send({ type: 'tick', seconds: 1 })
  game.send({ type: 'collection' })
  game.send({ type: 'difficulty', value: 'easy' })
  assert.equal(savedFromState(game.state).draft.difficulty, 'hard')
  const restored = controller(savedFromState(game.state), 'quick')
  assert.equal(restored.state.difficulty, 'hard')
  assert.equal(restored.state.bricks.length, 1)
  assert.equal(restored.state.elapsed, 1)
  assert.equal(restored.state.saved.muted, true)
})

test('hints are limited, difficulty affects scoring, best stars never decrease', () => {
  const game = controller()
  game.send({ type: 'difficulty', value: 'hard' })
  game.send({ type: 'start', levelId: 'tower' })
  for (const brick of LEVELS[0].bricks) game.send({ type: 'place', brick })
  game.send({ type: 'start', levelId: 'tower' })
  game.send({ type: 'hint' })
  game.send({ type: 'hint' })
  assert.equal(game.state.hints, 1)
  for (const brick of LEVELS[0].bricks) game.send({ type: 'place', brick })
  assert.equal(game.state.result.stars, 2)
  assert.equal(game.state.saved.progress.tower.hard, 3)
  const completed = game.state
  game.send({ type: 'undo' })
  assert.equal(game.state, completed)
})

test('palette limits and keyboard cycling respect available shapes and colours', () => {
  const game = controller()
  game.send({ type: 'difficulty', value: 'hard' })
  game.send({ type: 'start', levelId: 'tower' })
  const brick = LEVELS[0].bricks[0]
  game.send({ type: 'place', brick })
  assert.equal(remaining(game.state, brick.type, brick.color), 0)
  game.send({ type: 'place', brick: { ...brick, x: 0, z: 0 } })
  assert.equal(game.state.notice.key, 'none left')
  game.send({ type: 'cycleType', direction: 1 })
  game.send({ type: 'cycleColor', direction: 1 })
  assert.ok(
    game.state.palette.has(
      `${game.state.selection.type}|${game.state.selection.color}`
    )
  )
  game.send({ type: 'tool', tool: 'remove' })
  assert.equal(game.state.tool, 'remove')
  game.send({ type: 'select', selection: brick })
  assert.equal(game.state.tool, 'build')
})

test('invalid storage, malformed drafts and unavailable storage fail gracefully', () => {
  const broken = {
    getItem() {
      return '{not json'
    },
    setItem() {
      throw Error('quota')
    },
  }
  assert.deepEqual(readSaved(broken), initialState().saved)
  assert.equal(writeSaved(broken, initialState().saved), false)
  const game = controller(
    { draft: { level: 'tower', difficulty: 'easy', code: 'bad' } },
    'quick'
  )
  assert.equal(game.state.screen, 'collection')
  assert.equal(game.state.notice.key, 'invalidDraft')
  assert.equal(readSaved({ getItem: () => 'null' }).muted, true)
  assert.equal(STORAGE_KEY, 'bricksmith.studio.v1')
})

test('rotation equivalence and slope support rules are preserved', () => {
  assert.equal(brickKey(bottom), brickKey({ ...bottom, rot: 1 }))
  const slope = { type: 's12', color: 'red', x: 0, z: 0, y: 0, rot: 0 }
  assert.equal(
    validatePlacement({ type: 'b11', color: 'red', x: 0, z: 0, y: 3, rot: 0 }, [
      slope,
    ]),
    'needs support'
  )
  assert.equal(
    validatePlacement({ type: 'b11', color: 'red', x: 0, z: 1, y: 3, rot: 0 }, [
      slope,
    ]),
    ''
  )
})

test('locale dictionaries have matching keys and cover all models, colours and shapes', () => {
  const keys = object => Object.keys(object).sort()
  assert.deepEqual(keys(sk), keys(en))
  for (const field of ['modelNames', 'colours', 'kinds', 'tools', 'messages'])
    assert.deepEqual(keys(sk[field]), keys(en[field]))
  for (const t of [en, sk]) {
    for (const level of LEVELS) assert.ok(t.modelNames[level.id])
    for (const colour of COLOURS) assert.ok(t.colours[colour.id])
    for (const type of TYPES) assert.ok(t.kinds[type.kind])
  }
})
