import { roundedTemplates } from './generated/rounded-templates.js'

const sceneCaches = new WeakMap()

/**
 * Cache procedural vertex calculations, not mutable mesh/GPU resources.
 * Each mesh gets its own arrays so UV projection and transform baking stay local.
 * @param {object & {onDisposeObservable: {addOnce: Function}}} scene
 * @param {readonly number[]} size
 * @param {number} radius
 */
export function roundedSolidData(scene, size, radius) {
  let cache = sceneCaches.get(scene)
  if (!cache) {
    cache = new Map()
    sceneCaches.set(scene, cache)
    scene.onDisposeObservable.addOnce(() => sceneCaches.delete(scene))
  }
  const key = `${size[0]}:${size[1]}:${size[2]}:${radius}`
  let data = cache.get(key)
  if (!data) {
    data = build(size, radius)
    // Bound retained CPU data even in a long-lived scene with generated dimensions.
    if (cache.size >= 256) cache.delete(cache.keys().next().value)
    cache.set(key, data)
  }
  return {
    positions: data.positions.slice(), normals: data.normals.slice(),
    indices: data.indices.slice(), uvs: data.uvs.slice(),
  }
}

/** Fit precomputed surface normals/topology to the requested dimensions.
 * @param {readonly number[]} size @param {number} radius
 */
function build(size, radius) {
  const half = size.map(v => v / 2)
  const r = Math.min(radius, ...half.map(v => v * .95))
  const core = half.map(v => v - r)
  const template = roundedTemplates[r <= .012 ? 0 : 1]
  const positions = new Array(template.normals.length)
  for (let i = 0; i < positions.length; i++)
    positions[i] = template.corners[i] * core[i % 3] + template.normals[i] * r
  return { positions, normals: template.normals, indices: template.indices, uvs: Array(positions.length / 3 * 2).fill(0) }
}
