import {
  TYPES,
  COLOURS,
  LEVELS,
  brickKey,
  paletteKey,
  validatePlacement,
  validateModel,
} from './models.js'
import {
  DIFFICULTIES,
  MAX_BRICKS,
  clamp,
  decodeBuild,
  encodeBuild,
  sanitizeSaved,
  savedFromState,
} from './persistence.js'

const typeById = new Map(TYPES.map(type => [type.id, type]))
const colorIds = new Set(COLOURS.map(color => color.id))
export const levelFor = state =>
  LEVELS.find(level => level.id === state.levelId)
export const isSandbox = state => state.levelId === 'sandbox'

export function makePalette(bricks, difficulty) {
  const raw = new Map()
  for (const brick of bricks) {
    const key = paletteKey(brick.type, brick.color)
    raw.set(key, (raw.get(key) || 0) + 1)
  }
  const fraction = DIFFICULTIES[difficulty].spare
  const entries = [...raw].map(([key, count]) => ({
    key,
    count,
    extra: Math.floor(count * fraction),
    remainder: (count * fraction) % 1,
  }))
  let left =
    Math.ceil(bricks.length * fraction) -
    entries.reduce((sum, entry) => sum + entry.extra, 0)
  for (const entry of [...entries].sort((a, b) => b.remainder - a.remainder)) {
    if (left > 0) {
      entry.extra++
      left--
    }
  }
  return new Map(entries.map(entry => [entry.key, entry.count + entry.extra]))
}

export function remaining(state, type, color) {
  if (isSandbox(state)) return Infinity
  const key = paletteKey(type, color)
  return (
    (state.palette.get(key) || 0) -
    state.bricks.filter(brick => paletteKey(brick.type, brick.color) === key)
      .length
  )
}
export function progressFor(state) {
  const level = levelFor(state)
  const placed = new Set(state.bricks.map(brickKey))
  const missing =
    level?.bricks.filter(brick => !placed.has(brickKey(brick))) || []
  const correct = new Set(
    level?.bricks.filter(brick => placed.has(brickKey(brick))).map(brickKey) ||
      []
  )
  return { missing, correct, total: level?.bricks.length || 0 }
}
export function paletteEntries(state) {
  if (isSandbox(state))
    return TYPES.map(type => ({
      type: type.id,
      color: state.selection.color,
      count: Infinity,
    }))
  return [...state.palette].map(([key]) => {
    const [type, color] = key.split('|')
    return { type, color, count: remaining(state, type, color) }
  })
}
export function placementReason(state, brick) {
  if (state.bricks.length >= MAX_BRICKS) return 'limitReached'
  return (
    validatePlacement(brick, state.bricks) ||
    (remaining(state, brick.type, brick.color) <= 0 ? 'none left' : '')
  )
}

export function initialState(saved = null) {
  const preferences = sanitizeSaved(saved)
  return {
    screen: 'collection',
    levelId: null,
    difficulty: preferences.difficulty,
    bricks: [],
    palette: new Map(),
    selection: { type: 'b22', color: 'green', rot: 0 },
    undo: [],
    redo: [],
    tool: 'build',
    filter: 'all',
    compare: false,
    booklet: true,
    hints: 0,
    hintBrick: null,
    mistakes: 0,
    elapsed: 0,
    result: null,
    dialog: null,
    notice: null,
    sound: null,
    revision: 0,
    session: 0,
    saved: preferences,
  }
}
function notice(state, key) {
  return {
    ...state,
    notice: { key, id: (state.notice?.id || 0) + 1 },
    sound: 'error',
    revision: state.revision + 1,
  }
}
function starsFor(state, count) {
  const limit =
    count * { easy: 19, medium: 25, hard: 32 }[state.difficulty] + 30
  let stars = 3
  if (state.elapsed > limit || state.mistakes > Math.max(3, count * 0.15))
    stars--
  if (state.hints > { easy: 3, medium: 1, hard: 0 }[state.difficulty]) stars--
  if (state.elapsed > limit * 2 || state.mistakes > count * 0.6) stars--
  return Math.max(1, stars)
}
function reconcile(state) {
  const { missing, correct, total } = progressFor(state)
  if (
    !isSandbox(state) &&
    total &&
    correct.size === total &&
    state.bricks.length === total
  ) {
    const stars = starsFor(state, total)
    return {
      ...state,
      result: { stars },
      dialog: 'result',
      hintBrick: null,
      sound: 'win',
      saved: {
        ...state.saved,
        progress: {
          ...state.saved.progress,
          [state.levelId]: {
            ...state.saved.progress[state.levelId],
            [state.difficulty]: Math.max(
              state.saved.progress[state.levelId]?.[state.difficulty] || 0,
              stars
            ),
          },
        },
      },
    }
  }
  if (state.difficulty === 'easy' && state.booklet && missing[0]) {
    const { type, color, rot } = missing[0]
    return { ...state, selection: { type, color, rot }, tool: 'build' }
  }
  return state
}
function edit(state, bricks, sound = 'place') {
  return reconcile({
    ...state,
    bricks,
    undo: [...state.undo.slice(-99), state.bricks],
    redo: [],
    hintBrick: null,
    revision: state.revision + 1,
    sound,
  })
}
function start(state, levelId) {
  const level = LEVELS.find(item => item.id === levelId)
  if (!level && levelId !== 'sandbox') return state
  const saved = savedFromState(state)
  const selection = level
    ? level.bricks[0]
    : { type: 'b22', color: 'green', rot: 0 }
  return {
    ...initialState(saved),
    screen: 'build',
    levelId,
    difficulty: state.difficulty,
    palette: level ? makePalette(level.bricks, state.difficulty) : new Map(),
    selection: {
      type: selection.type,
      color: selection.color,
      rot: selection.rot,
    },
    dialog: saved.seenTutorial ? null : 'help',
    saved: { ...saved, seenTutorial: true },
    session: state.session + 1,
    revision: state.revision + 1,
  }
}
function select(state, selection) {
  if (
    !typeById.has(selection.type) ||
    !colorIds.has(selection.color) ||
    (!isSandbox(state) &&
      !state.palette.has(paletteKey(selection.type, selection.color)))
  )
    return state
  return {
    ...state,
    selection: {
      type: selection.type,
      color: selection.color,
      rot: Math.floor(clamp(selection.rot ?? state.selection.rot, 0, 3)),
    },
    tool: 'build',
  }
}
function restore(state, code) {
  try {
    return edit({ ...state, dialog: null }, decodeBuild(code))
  } catch (error) {
    return notice(state, error.message)
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'start':
      return start(state, action.levelId)
    case 'collection':
      return {
        ...initialState(savedFromState(state)),
        session: state.session,
        revision: state.revision + 1,
      }
    case 'difficulty':
      return Object.hasOwn(DIFFICULTIES, action.value) &&
        state.screen === 'collection'
        ? { ...state, difficulty: action.value }
        : state
    case 'place': {
      if (state.screen !== 'build' || state.result || state.tool !== 'build')
        return state
      const reason = placementReason(state, action.brick)
      if (reason)
        return notice({ ...state, mistakes: state.mistakes + 1 }, reason)
      const matches =
        isSandbox(state) ||
        levelFor(state).bricks.some(
          brick => brickKey(brick) === brickKey(action.brick)
        )
      return edit({ ...state, mistakes: state.mistakes + (matches ? 0 : 1) }, [
        ...state.bricks,
        { ...action.brick },
      ])
    }
    case 'remove': {
      if (state.screen !== 'build' || state.result || !action.brick)
        return state
      const index = state.bricks.findIndex(
        brick => brickKey(brick) === brickKey(action.brick)
      )
      if (index < 0) return state
      const bricks = state.bricks.filter((_, i) => i !== index)
      return validateModel(bricks).ok
        ? edit(state, bricks, 'remove')
        : notice(state, 'supportsOther')
    }
    case 'undo':
      return !state.undo.length || state.result
        ? state
        : reconcile({
            ...state,
            bricks: state.undo.at(-1),
            undo: state.undo.slice(0, -1),
            redo: [...state.redo, state.bricks],
            revision: state.revision + 1,
            sound: 'remove',
            hintBrick: null,
          })
    case 'redo':
      return !state.redo.length || state.result
        ? state
        : reconcile({
            ...state,
            bricks: state.redo.at(-1),
            redo: state.redo.slice(0, -1),
            undo: [...state.undo, state.bricks],
            revision: state.revision + 1,
            sound: 'place',
            hintBrick: null,
          })
    case 'select':
      return select(state, action.selection)
    case 'cycleType': {
      const entries = paletteEntries(state),
        types = [...new Set(entries.map(entry => entry.type))]
      const index =
        action.index === undefined
          ? (types.indexOf(state.selection.type) +
              action.direction +
              types.length) %
            types.length
          : Math.min(action.index, types.length - 1)
      const match =
        entries.find(
          entry =>
            entry.type === types[index] && entry.color === state.selection.color
        ) || entries.find(entry => entry.type === types[index])
      return match ? select(state, match) : state
    }
    case 'cycleColor': {
      const colors = isSandbox(state)
        ? COLOURS.map(color => color.id)
        : [
            ...new Set(
              paletteEntries(state)
                .filter(entry => entry.type === state.selection.type)
                .map(entry => entry.color)
            ),
          ]
      const color =
        colors[
          (colors.indexOf(state.selection.color) +
            action.direction +
            colors.length) %
            colors.length
        ]
      return select(state, { ...state.selection, color })
    }
    case 'rotate':
      return {
        ...state,
        selection: { ...state.selection, rot: (state.selection.rot + 1) % 4 },
      }
    case 'tool':
      return ['build', 'pick', 'remove'].includes(action.tool)
        ? { ...state, tool: state.tool === action.tool ? 'build' : action.tool }
        : state
    case 'filter':
      return { ...state, filter: action.value }
    case 'booklet':
      return reconcile({ ...state, booklet: !state.booklet })
    case 'compare':
      return isSandbox(state) ? state : { ...state, compare: !state.compare }
    case 'hint': {
      if (
        isSandbox(state) ||
        state.result ||
        state.hints >= DIFFICULTIES[state.difficulty].hints
      )
        return state
      const brick = progressFor(state).missing[0]
      return brick
        ? { ...state, hints: state.hints + 1, hintBrick: brick }
        : state
    }
    case 'clearHint':
      return { ...state, hintBrick: null }
    case 'tick':
      return state.screen === 'build' && !state.dialog && !state.result
        ? { ...state, elapsed: state.elapsed + clamp(action.seconds, 0, 1.5) }
        : state
    case 'dialog':
      return { ...state, dialog: action.dialog, notice: null }
    case 'mute':
      return { ...state, saved: { ...state.saved, muted: !state.saved.muted } }
    case 'resetProgress':
      return {
        ...state,
        saved: { ...state.saved, progress: {} },
        dialog: 'settings',
      }
    case 'clear':
      return isSandbox(state) && !state.result
        ? edit({ ...state, dialog: null }, [], 'remove')
        : state
    case 'saveSlot': {
      if (
        !isSandbox(state) ||
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index > 2
      )
        return state
      const slots = state.saved.slots.map((slot, index) =>
        index === action.index
          ? {
              code: encodeBuild(state.bricks),
              count: state.bricks.length,
              date: action.date,
            }
          : slot
      )
      return { ...state, saved: { ...state.saved, slots } }
    }
    case 'loadSlot':
      return isSandbox(state) && state.saved.slots[action.index]
        ? restore(state, state.saved.slots[action.index].code)
        : state
    case 'import':
      return isSandbox(state) ? restore(state, action.code) : state
    case 'resume': {
      const draft = state.saved.draft
      if (!draft) return state
      try {
        if (
          !Object.hasOwn(DIFFICULTIES, draft.difficulty) ||
          (!LEVELS.some(level => level.id === draft.level) &&
            draft.level !== 'sandbox')
        )
          throw new Error()
        const bricks = decodeBuild(draft.code)
        const next = start(
          { ...state, difficulty: draft.difficulty },
          draft.level
        )
        // Reject a tampered puzzle save containing unavailable parts.
        if (
          draft.level !== 'sandbox' &&
          bricks.some(
            brick => remaining({ ...next, bricks }, brick.type, brick.color) < 0
          )
        )
          throw new Error()
        return reconcile({
          ...next,
          bricks,
          hints: draft.hints,
          mistakes: draft.mistakes,
          elapsed: draft.elapsed,
          dialog: null,
        })
      } catch {
        return notice(state, 'invalidDraft')
      }
    }
    case 'next': {
      const index = LEVELS.findIndex(level => level.id === state.levelId) + 1
      return index < LEVELS.length
        ? start(state, LEVELS[index].id)
        : gameReducer(state, { type: 'collection' })
    }
    case 'dismissNotice':
      return { ...state, notice: null }
    default:
      return state
  }
}

export function initializeGame(saved, mode) {
  const state = initialState(saved)
  const levelId =
    mode === 'sandbox' ? 'sandbox' : mode === 'quick' ? 'tower' : null
  if (!levelId) return state
  return gameReducer(
    state,
    state.saved.draft?.level === levelId
      ? { type: 'resume' }
      : { type: 'start', levelId }
  )
}
