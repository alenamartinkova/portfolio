import { brickKey, footprint } from './models.js'

const shapeKey = brick => brickKey({ ...brick, x: 0, z: 0 })
const targets = new WeakMap()

function indexTarget(bricks) {
  if (targets.has(bricks)) return targets.get(bricks)
  const groups = new Map()
  let minX = 24,
    minZ = 24,
    maxX = 0,
    maxZ = 0
  for (const brick of bricks) {
    const key = shapeKey(brick)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(brick)
    const { w, d } = footprint(brick)
    minX = Math.min(minX, brick.x)
    minZ = Math.min(minZ, brick.z)
    maxX = Math.max(maxX, brick.x + w)
    maxZ = Math.max(maxZ, brick.z + d)
  }
  const target = { groups, minX, minZ, maxX, maxZ }
  targets.set(bricks, target)
  return target
}

// Every matching pair votes for one translation of the ENTIRE model. Height,
// colour and orientation stay part of the key, so relative geometry still counts.
export function matchModel(target, build) {
  const indexed = indexTarget(target)
  const offsets = new Map([['0,0', { x: 0, z: 0, count: 0 }]])
  for (const brick of build) {
    for (const reference of indexed.groups.get(shapeKey(brick)) || []) {
      const x = brick.x - reference.x,
        z = brick.z - reference.z
      // Keep the full blueprint on the plate, including its missing pieces.
      if (
        indexed.minX + x < 0 ||
        indexed.maxX + x > 24 ||
        indexed.minZ + z < 0 ||
        indexed.maxZ + z > 24
      )
        continue
      const key = `${x},${z}`
      if (!offsets.has(key)) offsets.set(key, { x, z, count: 0 })
      offsets.get(key).count++
    }
  }
  // Original placement wins ties; otherwise the earliest matching piece does.
  let best = offsets.get('0,0')
  for (const offset of offsets.values()) {
    if (offset.count > best.count) best = offset
  }
  const placed = new Set(build.map(brickKey))
  const correct = new Set(),
    missing = [],
    missingIndices = []
  target.forEach((brick, index) => {
    const aligned = { ...brick, x: brick.x + best.x, z: brick.z + best.z }
    const key = brickKey(aligned)
    if (placed.has(key)) correct.add(key)
    else {
      missing.push(aligned)
      missingIndices.push(index)
    }
  })
  return {
    correct,
    missing,
    missingIndices,
    total: target.length,
    offset: { x: best.x, z: best.z },
  }
}
