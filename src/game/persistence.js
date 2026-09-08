import { TYPES, COLOURS, LEVELS, validateModel } from './models.js'

// Preserve saves and export codes made by the original BRICKSMITH version.
export const STORAGE_KEY = 'bricksmith.studio.v1'
export const MAX_BRICKS = 2400
export const DIFFICULTIES = {
  easy: { spare: 0.3, hints: Infinity },
  medium: { spare: 0.1, hints: 3 },
  hard: { spare: 0, hints: 1 },
}
export const clamp = (value, min, max) =>
  Math.min(
    max,
    Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min)
  )

export function encodeBuild(bricks) {
  const data = bricks.map(brick => [
    TYPES.findIndex(type => type.id === brick.type),
    COLOURS.findIndex(color => color.id === brick.color),
    brick.x,
    brick.z,
    brick.y,
    brick.rot,
  ])
  return (
    'BS1.' +
    btoa(JSON.stringify(data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  )
}

export function decodeBuild(code) {
  if (
    typeof code !== 'string' ||
    code.length > 200000 ||
    !code.trim().startsWith('BS1.')
  )
    throw new Error('invalidCode')
  let data
  try {
    const raw = code.trim().slice(4)
    if (!/^[A-Za-z0-9_-]*$/.test(raw)) throw new Error()
    data = JSON.parse(atob(raw.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    throw new Error('invalidCode')
  }
  if (!Array.isArray(data) || data.length > MAX_BRICKS)
    throw new Error('invalidCode')
  const bricks = data
    .map(row => {
      if (
        !Array.isArray(row) ||
        row.length !== 6 ||
        row.some(value => !Number.isInteger(value)) ||
        !TYPES[row[0]] ||
        !COLOURS[row[1]] ||
        row[5] < 0 ||
        row[5] > 3
      )
        throw new Error('invalidCode')
      return {
        type: TYPES[row[0]].id,
        color: COLOURS[row[1]].id,
        x: row[2],
        z: row[3],
        y: row[4],
        rot: row[5],
      }
    })
    .sort((a, b) => a.y - b.y)
  if (!validateModel(bricks).ok) throw new Error('invalidBuild')
  return bricks
}

export function sanitizeSaved(value) {
  const raw =
    value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const progress = {}
  for (const level of LEVELS) {
    const stars = raw.progress?.[level.id]
    if (stars && typeof stars === 'object') {
      progress[level.id] = Object.fromEntries(
        Object.keys(DIFFICULTIES).map(id => [
          id,
          Math.floor(clamp(stars[id], 0, 3)),
        ])
      )
    }
  }
  return {
    progress,
    slots: Array.from({ length: 3 }, (_, index) => {
      const slot = raw.slots?.[index]
      return slot && typeof slot.code === 'string' && slot.code.length <= 200000
        ? {
            code: slot.code,
            count: clamp(slot.count, 0, MAX_BRICKS),
            date: clamp(slot.date, 0, Number.MAX_SAFE_INTEGER),
          }
        : null
    }),
    difficulty: Object.hasOwn(DIFFICULTIES, raw.difficulty)
      ? raw.difficulty
      : 'easy',
    muted: typeof raw.muted === 'boolean' ? raw.muted : true,
    seenTutorial: raw.seenTutorial === true,
    draft:
      raw.draft &&
      typeof raw.draft === 'object' &&
      typeof raw.draft.code === 'string' &&
      raw.draft.code.length <= 200000
        ? {
            level: raw.draft.level,
            code: raw.draft.code,
            difficulty: raw.draft.difficulty,
            elapsed: clamp(raw.draft.elapsed, 0, 359999),
            hints: clamp(raw.draft.hints, 0, 9999),
            mistakes: clamp(raw.draft.mistakes, 0, 9999),
          }
        : null,
  }
}

export function readSaved(storage) {
  try {
    return sanitizeSaved(JSON.parse(storage.getItem(STORAGE_KEY)))
  } catch {
    return sanitizeSaved(null)
  }
}
export function writeSaved(storage, saved) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return true
  } catch {
    return false
  }
}

export function savedFromState(state) {
  const saved = { ...state.saved, difficulty: state.difficulty }
  if (!state.levelId) return saved
  if (state.result || !state.bricks.length) {
    if (saved.draft?.level === state.levelId) saved.draft = null
  } else {
    saved.draft = {
      level: state.levelId,
      code: encodeBuild(state.bricks),
      difficulty: state.difficulty,
      elapsed: state.elapsed,
      hints: state.hints,
      mistakes: state.mistakes,
    }
  }
  return saved
}
