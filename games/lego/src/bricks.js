// Procedural models and placement rules adapted from the supplied BRICKSMITH game.
export const TYPES = [
  { id: 'b11', name: '1 × 1 brick', w: 1, d: 1, h: 3, kind: 'brick' },
  { id: 'b12', name: '1 × 2 brick', w: 1, d: 2, h: 3, kind: 'brick' },
  { id: 'b13', name: '1 × 3 brick', w: 1, d: 3, h: 3, kind: 'brick' },
  { id: 'b14', name: '1 × 4 brick', w: 1, d: 4, h: 3, kind: 'brick' },
  { id: 'b22', name: '2 × 2 brick', w: 2, d: 2, h: 3, kind: 'brick' },
  { id: 'b23', name: '2 × 3 brick', w: 2, d: 3, h: 3, kind: 'brick' },
  { id: 'b24', name: '2 × 4 brick', w: 2, d: 4, h: 3, kind: 'brick' },
  { id: 'b26', name: '2 × 6 brick', w: 2, d: 6, h: 3, kind: 'brick' },
  { id: 'p12', name: '1 × 2 plate', w: 1, d: 2, h: 1, kind: 'plate' },
  { id: 'p22', name: '2 × 2 plate', w: 2, d: 2, h: 1, kind: 'plate' },
  { id: 'p24', name: '2 × 4 plate', w: 2, d: 4, h: 1, kind: 'plate' },
  { id: 'p44', name: '4 × 4 plate', w: 4, d: 4, h: 1, kind: 'plate' },
  { id: 's12', name: '1 × 2 slope', w: 1, d: 2, h: 3, kind: 'slope' },
  { id: 's22', name: '2 × 2 slope', w: 2, d: 2, h: 3, kind: 'slope' },
  { id: 'r11', name: '1 × 1 round', w: 1, d: 1, h: 3, kind: 'round' },
]
export const COLOURS = [
  { id: 'red', name: 'Poppy red', hex: '#E95A4F' },
  { id: 'blue', name: 'Ocean blue', hex: '#4B85C5' },
  { id: 'yellow', name: 'Sunflower', hex: '#F3CA4F' },
  { id: 'green', name: 'Leaf green', hex: '#76A77C' },
  { id: 'white', name: 'Warm white', hex: '#F6F2E9' },
  { id: 'black', name: 'Ink black', hex: '#30343B' },
  { id: 'lightGrey', name: 'Pebble grey', hex: '#B9C0C4' },
  { id: 'darkGrey', name: 'Slate grey', hex: '#68737D' },
  { id: 'orange', name: 'Tangerine', hex: '#ED9652' },
  { id: 'tan', name: 'Sandstone', hex: '#D8BE91' },
  { id: 'brown', name: 'Chestnut', hex: '#91684F' },
]
const TYPE_BY_ID = Object.fromEntries(TYPES.map(t => [t.id, t]))
const COLOUR_BY_ID = Object.fromEntries(COLOURS.map(c => [c.id, c]))
export function footprint(brick) {
  const t = TYPE_BY_ID[brick.type]
  if (!t) return { w: 0, d: 0, h: 0 }
  return { w: brick.rot % 2 ? t.d : t.w, d: brick.rot % 2 ? t.w : t.d, h: t.h }
}
export function paletteKey(type, color) {
  return type + '|' + color
}
export function brickKey(brick) {
  const t = TYPE_BY_ID[brick.type]
  let r = ((brick.rot % 4) + 4) % 4
  if (t && t.kind !== 'slope') r = t.w === t.d ? 0 : r % 2
  return [brick.type, brick.color, brick.x, brick.z, brick.y, r].join('|')
}
// A slope has studs only along its high back edge. Rotation is clockwise
// when seen from above: 0 +Z, 1 -X, 2 -Z, 3 +X.
export function supportSurface(brick) {
  const t = TYPE_BY_ID[brick.type],
    f = footprint(brick),
    cells = []
  if (!t) return cells
  for (let x = 0; x < f.w; x++)
    for (let z = 0; z < f.d; z++) {
      if (t.kind === 'slope') {
        const high = [z === f.d - 1, x === 0, z === 0, x === f.w - 1][brick.rot]
        if (!high) continue
      }
      cells.push({ x: brick.x + x, z: brick.z + z })
    }
  return cells
}
export function validatePlacement(brick, existing) {
  if (
    !brick ||
    !TYPE_BY_ID[brick.type] ||
    !COLOUR_BY_ID[brick.color] ||
    !['x', 'z', 'y', 'rot'].every(k => Number.isInteger(brick[k])) ||
    brick.rot < 0 ||
    brick.rot > 3
  )
    return 'invalid brick'
  const f = footprint(brick)
  if (
    brick.x < 0 ||
    brick.z < 0 ||
    brick.x + f.w > 24 ||
    brick.z + f.d > 24 ||
    brick.y < 0
  )
    return 'outside plate'
  if (brick.y + f.h > 60) return 'too high'
  let supported = brick.y === 0
  for (const b of existing) {
    const q = footprint(b)
    const planar =
      brick.x < b.x + q.w &&
      brick.x + f.w > b.x &&
      brick.z < b.z + q.d &&
      brick.z + f.d > b.z
    if (planar && brick.y < b.y + q.h && brick.y + f.h > b.y) return 'overlaps'
    if (!supported && planar && b.y + q.h === brick.y) {
      supported = supportSurface(b).some(
        p =>
          p.x >= brick.x &&
          p.x < brick.x + f.w &&
          p.z >= brick.z &&
          p.z < brick.z + f.d
      )
    }
  }
  return supported ? '' : 'needs support'
}
export function validateModel(bricks) {
  if (!Array.isArray(bricks))
    return { ok: false, errors: ['Model must be an array.'] }
  const errors = [],
    placed = []
  const sorted = [...bricks].sort(
    (a, b) =>
      (a?.y ?? 0) - (b?.y ?? 0) ||
      (a?.z ?? 0) - (b?.z ?? 0) ||
      (a?.x ?? 0) - (b?.x ?? 0)
  )
  for (let i = 0; i < sorted.length; i++) {
    const reason = validatePlacement(sorted[i], placed)
    if (reason) errors.push('Brick ' + (i + 1) + ': ' + reason)
    else placed.push(sorted[i])
  }
  return { ok: errors.length === 0, errors }
}
