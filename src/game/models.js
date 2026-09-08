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
function modelBuilder() {
  const bricks = []
  return {
    bricks,
    add(type, color, x, z, y = 0, rot = 0) {
      bricks.push({ type, color, x, z, y, rot })
    },
    wall(type, color, x, z, y, layers = 1, rot = 0) {
      const h = TYPE_BY_ID[type].h
      for (let i = 0; i < layers; i++)
        bricks.push({
          type,
          color: typeof color === 'function' ? color(i) : color,
          x,
          z,
          y: y + i * h,
          rot,
        })
    },
    pad(x, z, color = 'green', cols = 2, rows = 2, y = 0) {
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++)
          bricks.push({
            type: 'p44',
            color,
            x: x + i * 4,
            z: z + j * 4,
            y,
            rot: 0,
          })
    },
    roof(x, z, y, color = 'orange') {
      // Two sloping courses over a supporting core create an eight-stud pitched roof.
      for (const u of [x + 2, x + 4])
        for (const v of [z, z + 4])
          bricks.push({ type: 'b24', color, x: u, z: v, y, rot: 0 })
      for (const v of [z, z + 2, z + 4, z + 6]) {
        bricks.push(
          { type: 's22', color, x, z: v, y, rot: 3 },
          { type: 's22', color, x: x + 6, z: v, y, rot: 1 }
        )
        bricks.push(
          { type: 's22', color, x: x + 2, z: v, y: y + 3, rot: 3 },
          { type: 's22', color, x: x + 4, z: v, y: y + 3, rot: 1 }
        )
      }
    },
    done() {
      return bricks.sort(
        (a, b) =>
          a.y - b.y || a.z - b.z || a.x - b.x || a.type.localeCompare(b.type)
      )
    },
  }
}
function makeTower() {
  const m = modelBuilder()
  m.add('p44', 'tan', 10, 10)
  m.wall('b22', i => (i % 2 ? 'white' : 'blue'), 11, 11, 1, 5)
  m.add('p44', 'blue', 10, 10, 16)
  for (const x of [10, 13])
    for (const z of [10, 13]) m.add('b11', 'yellow', x, z, 17)
  return m.done()
}
function makeBench() {
  const m = modelBuilder()
  for (const x of [8, 15]) for (const z of [10, 11]) m.add('b11', 'brown', x, z)
  for (const x of [8, 12]) m.add('b24', 'tan', x, 10, 3, 1)
  for (const x of [8, 15]) m.add('b11', 'brown', x, 11, 6)
  for (const x of [8, 12]) m.add('b14', 'tan', x, 11, 9, 1)
  return m.done()
}
function makeStaircase() {
  const m = modelBuilder()
  for (let layer = 0; layer < 4; layer++)
    for (let step = layer; step < 4; step++)
      m.add(
        'b24',
        ['blue', 'green', 'yellow', 'orange'][layer],
        10,
        8 + step * 2,
        layer * 3,
        1
      )
  return m.done()
}
function makeSmallBridge() {
  const m = modelBuilder()
  for (const x of [8, 14]) m.wall('b22', 'lightGrey', x, 11, 0, 2)
  for (const x of [8, 12]) m.add('p44', 'tan', x, 10, 6)
  for (const x of [8, 15])
    for (const z of [10, 13]) m.add('b11', 'brown', x, z, 7)
  for (const x of [8, 12])
    for (const z of [10, 13]) m.add('b14', 'red', x, z, 10, 1)
  return m.done()
}
function makeCottage() {
  const m = modelBuilder()
  m.pad(8, 8, 'green')
  for (let layer = 0; layer < 3; layer++) {
    const y = 1 + layer * 3
    for (const x of [8, 12]) m.add('b14', 'tan', x, 14, y, 1)
    for (const x of [8, 15])
      m.add('b14', layer === 1 ? 'white' : 'tan', x, 10, y)
    if (layer < 2)
      for (const x of [8, 13])
        m.add('b13', layer === 1 ? 'blue' : 'tan', x, 9, y, 1)
    else for (const x of [8, 12]) m.add('b14', 'tan', x, 9, y, 1)
  }
  m.pad(8, 8, 'white', 2, 2, 10)
  m.roof(8, 8, 11, 'orange')
  return m.done()
}
function makeCar() {
  const m = modelBuilder()
  for (const x of [8, 14]) for (const z of [9, 13]) m.add('b22', 'black', x, z)
  for (const x of [8, 12]) m.add('p44', 'darkGrey', x, 10, 3)
  for (const x of [8, 12])
    for (const z of [10, 12]) m.add('b24', 'blue', x, z, 4, 1)
  for (const x of [8, 15]) m.add('b14', 'lightGrey', x, 10, 7)
  for (const z of [10, 12]) m.add('b24', 'blue', 10, z, 7, 1)
  for (const x of [9, 14])
    for (const z of [10, 12]) m.add('b12', 'blue', x, z, 7)
  for (const x of [10, 13]) m.add('b14', 'white', x, 10, 10)
  for (const z of [10, 13]) m.add('b12', 'white', 11, z, 10, 1)
  m.add('p44', 'yellow', 10, 10, 13)
  for (const z of [10, 13]) {
    m.add('b11', 'yellow', 8, z, 10)
    m.add('b11', 'red', 15, z, 10)
  }
  return m.done()
}
function makeTree() {
  const m = modelBuilder()
  m.pad(8, 8, 'green')
  m.wall('b22', 'brown', 11, 11, 1, 4)
  m.pad(8, 8, 'green', 2, 2, 13)
  for (const x of [8, 10, 12, 14])
    for (const z of [8, 10, 12, 14]) {
      const edge = x === 8 || x === 14 || z === 8 || z === 14
      const r = x === 8 ? 3 : x === 14 ? 1 : z === 8 ? 0 : 2
      m.add(edge ? 's22' : 'b22', 'green', x, z, 14, edge ? r : 0)
    }
  for (const x of [10, 12])
    for (const z of [10, 12]) m.add('b22', 'green', x, z, 17)
  m.add('b22', 'yellow', 11, 11, 20)
  for (const x of [8, 11, 15]) m.add('r11', 'red', x, 15, 1)
  return m.done()
}
function makeLighthouse() {
  const m = modelBuilder()
  m.pad(8, 8, 'tan')
  for (let layer = 0; layer < 8; layer++)
    for (const z of [10, 12])
      m.add('b24', layer % 2 ? 'red' : 'white', 10, z, 1 + layer * 3, 1)
  m.pad(8, 8, 'white', 2, 2, 25)
  m.add('b22', 'yellow', 11, 11, 26)
  for (const x of [9, 14])
    for (const z of [9, 14]) m.add('b11', 'darkGrey', x, z, 26)
  m.pad(8, 8, 'darkGrey', 2, 2, 29)
  m.add('b22', 'red', 11, 11, 30)
  m.add('r11', 'white', 11, 11, 33)
  return m.done()
}
function makeCastle() {
  const m = modelBuilder()
  for (const x of [4, 16])
    for (const z of [5, 15]) {
      for (let layer = 0; layer < 5; layer++)
        for (const dz of [0, 2])
          m.add(
            'b24',
            layer === 0 ? 'tan' : 'lightGrey',
            x,
            z + dz,
            layer * 3,
            1
          )
      m.add('p44', 'darkGrey', x, z, 15)
      for (const dx of [0, 3])
        for (const dz of [0, 3]) m.add('b11', 'lightGrey', x + dx, z + dz, 16)
    }
  for (let layer = 0; layer < 3; layer++) {
    const color = layer === 0 ? 'tan' : 'lightGrey',
      y = layer * 3
    for (const x of [8, 12]) m.add('b24', color, x, 17, y, 1)
    for (const x of [4, 18]) m.add('b26', color, x, 9, y)
    if (layer < 2) for (const x of [8, 14]) m.add('b22', color, x, 5, y)
    else for (const x of [8, 12]) m.add('b24', color, x, 5, y, 1)
  }
  for (const x of [8, 11, 14]) m.add('b11', 'darkGrey', x, 18, 9)
  for (const x of [8, 9, 14, 15]) m.add('b11', 'darkGrey', x, 5, 9)
  for (const x of [4, 19])
    for (const z of [10, 12, 14]) m.add('b11', 'darkGrey', x, z, 9)
  for (const x of [10, 12])
    for (const z of [10, 12]) {
      m.wall('b22', 'tan', x, z, 0, 3)
      m.add('s22', 'blue', x, z, 9, x === 10 ? 3 : 1)
    }
  for (const x of [4, 19]) {
    m.add('r11', 'darkGrey', x, 5, 19)
    m.add('p12', x === 4 ? 'red' : 'blue', x, 5, 22, 1)
  }
  m.add('p24', 'tan', 10, 5, 0, 1)
  return m.done()
}
function makeRocket() {
  const m = modelBuilder()
  m.pad(6, 6, 'darkGrey', 3, 3)
  m.add('b22', 'black', 11, 11, 1)
  m.add('p44', 'red', 10, 10, 4)
  for (let layer = 0; layer < 8; layer++)
    for (const x of [10, 12])
      for (const z of [10, 12]) {
        const color =
          layer === 0 || layer === 3
            ? 'red'
            : layer === 5 && z === 10
              ? 'blue'
              : 'white'
        m.add('b22', color, x, z, 5 + layer * 3)
      }
  for (const x of [10, 12])
    for (const z of [10, 12]) m.add('s22', 'red', x, z, 29, x === 10 ? 3 : 1)
  m.add('b22', 'red', 11, 11, 32)
  m.add('r11', 'white', 11, 11, 35)
  for (let layer = 0; layer < 12; layer++) {
    const arm = [3, 6, 9].includes(layer)
    m.add(
      arm ? 'b24' : 'b22',
      layer % 3 === 0 ? 'darkGrey' : 'yellow',
      arm ? 14 : 16,
      10,
      1 + layer * 3,
      arm ? 1 : 0
    )
  }
  m.add('p24', 'yellow', 14, 10, 37, 1)
  m.add('r11', 'red', 16, 10, 38)
  const fins = [
    { x: 9, z: 11, r: 0 },
    { x: 14, z: 11, r: 0 },
    { x: 11, z: 9, r: 1 },
    { x: 11, z: 14, r: 1 },
  ]
  for (const f of fins) {
    m.add('b12', 'red', f.x, f.z, 1, f.r)
    m.add('p12', 'red', f.x, f.z, 4, f.r)
    m.add('s12', 'red', f.x, f.z, 5, f.r)
  }
  for (const x of [6, 10, 14, 16])
    for (const z of [6, 17]) m.add('p12', 'yellow', x, z, 1, 1)
  return m.done()
}
function makeLocomotive() {
  const m = modelBuilder()
  for (let x = 4; x < 20; x += 2) {
    m.add('p24', 'brown', x, 10)
    for (const z of [10, 13]) m.add('p12', 'darkGrey', x, z, 1, 1)
  }
  for (const x of [6, 10, 14, 18])
    for (const z of [9, 13]) m.add('b22', 'black', x, z, 2)
  for (const x of [6, 10, 14]) m.add('p44', 'darkGrey', x, 10, 5)
  m.add('p24', 'darkGrey', 18, 10, 5)
  for (const x of [6, 10, 14])
    for (const z of [10, 12]) m.add('b24', 'red', x, z, 6, 1)
  for (const y of [9, 12]) {
    m.add('b26', 'green', 7, 11, y, 1)
    m.add('b12', 'black', 6, 11, y)
  }
  for (const z of [10, 13]) m.add('b14', 'red', 7, z, 9, 1)
  m.add('s12', 'black', 6, 11, 15)
  m.wall('r11', 'darkGrey', 8, 11, 15, 3)
  m.add('b22', 'black', 8, 11, 24)
  m.add('r11', 'yellow', 11, 11, 15)
  for (const y of [9, 12]) {
    for (const x of [14, 17]) m.add('b14', y === 9 ? 'green' : 'blue', x, 10, y)
    for (const z of [10, 13])
      m.add('b12', y === 9 ? 'green' : 'blue', 15, z, y, 1)
  }
  m.add('p44', 'darkGrey', 14, 10, 15)
  m.add('p44', 'darkGrey', 14, 10, 16)
  for (const x of [14, 16])
    for (const z of [10, 12]) m.add('s22', 'green', x, z, 17, x === 14 ? 3 : 1)
  m.wall('b24', 'green', 18, 10, 6, 3)
  for (const x of [18, 19])
    for (const z of [10, 12]) m.add('r11', 'black', x, z, 15)
  for (const x of [7, 10])
    for (const z of [10, 13]) m.add('b11', 'red', x, z, 12)
  for (const x of [6, 10, 14, 18])
    for (const z of [9, 14]) m.add('r11', 'lightGrey', x, z, 5)
  return m.done()
}
function makeWindmill() {
  const m = modelBuilder()
  m.pad(8, 8, 'green')
  m.add('p24', 'tan', 10, 6, 0, 1)
  for (let layer = 0; layer < 5; layer++) {
    const y = 1 + layer * 3
    for (const x of [9, 11, 13])
      for (const z of [9, 11, 13]) {
        if (z === 9 && ((layer < 2 && x === 11) || layer === 2)) continue
        m.add(
          'b22',
          layer === 3 && z === 9 ? 'blue' : layer === 0 ? 'brown' : 'tan',
          x,
          z,
          y
        )
      }
    if (layer === 2) m.add('b26', 'tan', 9, 9, y, 1)
  }
  m.pad(8, 8, 'brown', 2, 2, 16)
  m.roof(8, 8, 17, 'blue')
  for (const y of [1, 4, 7]) m.add('b12', 'white', 11, 7, y, 1)
  m.add('b22', 'white', 11, 7, 10)
  for (const x of [8, 12]) m.add('b24', 'white', x, 7, 13, 1)
  for (const y of [16, 19, 22, 25])
    m.add('b12', y === 16 ? 'yellow' : 'white', 11, 7, y, 1)
  for (const x of [8, 15])
    for (const z of [8, 15]) m.add('r11', x === 8 ? 'red' : 'yellow', x, z, 1)
  return m.done()
}
export const LEVELS = [
  {
    id: 'tower',
    name: 'Tower',
    tier: 1,
    tagline: 'A little taller, one click at a time.',
    description: 'Stack a striped lookout and finish its sunny crown.',
    accent: '#4B85C5',
    bricks: makeTower(),
  },
  {
    id: 'bench',
    name: 'Bench',
    tier: 1,
    tagline: 'Make a place to pause.',
    description: 'Four feet, a warm wooden seat, and a welcoming backrest.',
    accent: '#D8BE91',
    bricks: makeBench(),
  },
  {
    id: 'staircase',
    name: 'Staircase',
    tier: 1,
    tagline: 'Small steps. Big ideas.',
    description: 'Four colourful steps teach you to build from the ground up.',
    accent: '#ED9652',
    bricks: makeStaircase(),
  },
  {
    id: 'bridge',
    name: 'Small bridge',
    tier: 1,
    tagline: 'Bring the two sides together.',
    description: 'Build sturdy stone piers, a deck, and bright red rails.',
    accent: '#E95A4F',
    bricks: makeSmallBridge(),
  },
  {
    id: 'cottage',
    name: 'Cottage with pitched roof',
    tier: 2,
    tagline: 'There is no place like built.',
    description:
      'A garden cottage with an open door, blue windows, and a terracotta roof.',
    accent: '#ED9652',
    bricks: makeCottage(),
  },
  {
    id: 'car',
    name: 'Car with black wheel bricks',
    tier: 2,
    tagline: 'Ready for a tiny road trip.',
    description:
      'Black wheels carry a blue body, white windows, and a sunny roof.',
    accent: '#4B85C5',
    bricks: makeCar(),
  },
  {
    id: 'tree',
    name: 'Tree',
    tier: 2,
    tagline: 'Grow something wonderful.',
    description:
      'A chestnut trunk supports a layered green canopy and fallen apples.',
    accent: '#76A77C',
    bricks: makeTree(),
  },
  {
    id: 'lighthouse',
    name: 'Striped lighthouse',
    tier: 2,
    tagline: 'A beacon for little adventures.',
    description:
      'Red and white stripes rise to a broad balcony and a golden lantern.',
    accent: '#E95A4F',
    bricks: makeLighthouse(),
  },
  {
    id: 'castle',
    name: 'Castle with four towers and gate',
    tier: 3,
    tagline: 'Your kingdom starts here.',
    description:
      'Four crowned towers, an open gate, a central keep, and two fluttering flags.',
    accent: '#899BAA',
    bricks: makeCastle(),
  },
  {
    id: 'rocket',
    name: 'Rocket on a launch pad',
    tier: 3,
    tagline: 'Imagination, cleared for takeoff.',
    description:
      'Build a striped rocket, its four fins, and a tall yellow service tower.',
    accent: '#ED9652',
    bricks: makeRocket(),
  },
  {
    id: 'locomotive',
    name: 'Steam locomotive',
    tier: 3,
    tagline: 'Full steam, stud by stud.',
    description:
      'Lay the tracks, fit eight wheels, and build a chimney, cab, and coal tender.',
    accent: '#76A77C',
    bricks: makeLocomotive(),
  },
  {
    id: 'windmill',
    name: 'Windmill',
    tier: 3,
    tagline: 'Let a bright idea take shape.',
    description:
      'A blue-roofed mill with an open doorway and sweeping white sails.',
    accent: '#4B85C5',
    bricks: makeWindmill(),
  },
]
