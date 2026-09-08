import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { TYPES, COLOURS } from '../bricks.js'

export function roundedBody(w, d, height) {
  const x = -w / 2 + 0.06,
    z = -d / 2 + 0.06,
    ww = w - 0.12,
    dd = d - 0.12,
    r = 0.035
  const shape = new THREE.Shape()
  shape.moveTo(x + r, z)
  shape.lineTo(x + ww - r, z)
  shape.quadraticCurveTo(x + ww, z, x + ww, z + r)
  shape.lineTo(x + ww, z + dd - r)
  shape.quadraticCurveTo(x + ww, z + dd, x + ww - r, z + dd)
  shape.lineTo(x + r, z + dd)
  shape.quadraticCurveTo(x, z + dd, x, z + dd - r)
  shape.lineTo(x, z + r)
  shape.quadraticCurveTo(x, z, x + r, z)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.12, height - 0.11),
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 2,
  })
  g.rotateX(-Math.PI / 2)
  g.translate(0, 0.055, 0)
  return g
}
function slopeBody(w, d, h) {
  const l = -w / 2 + 0.035,
    r = w / 2 - 0.035,
    f = -d / 2 + 0.035,
    back = d / 2 - 0.035
  const ridge = back - Math.min(0.97, d - 0.1),
    low = 0.055,
    high = h - 0.035,
    front = 0.16
  const vertices = [
    [l, low, f],
    [r, low, f],
    [l, front, f],
    [r, front, f],
    [l, high, ridge],
    [r, high, ridge],
    [l, high, back],
    [r, high, back],
    [l, low, back],
    [r, low, back],
  ]
  const faces = [
    0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 7, 4, 7, 6, 6, 7, 9, 6, 9, 8, 8,
    9, 1, 8, 1, 0, 0, 2, 4, 0, 4, 6, 0, 6, 8, 1, 9, 7, 1, 7, 5, 1, 5, 3,
  ]
  const g = new THREE.BufferGeometry()
  const pos = []
  for (let i = 0; i < faces.length; i += 3) {
    pos.push(
      ...vertices[faces[i]],
      ...vertices[faces[i + 2]],
      ...vertices[faces[i + 1]]
    )
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      new Float32Array((pos.length / 3) * 2),
      2
    )
  )
  return g
}

// Each studio owns its caches and releases them when the scene unmounts.
export function createBrickResources() {
  const typeMap = new Map(TYPES.map(type => [type.id, type]))
  const colorMap = new Map(COLOURS.map(color => [color.id, color]))
  const geometryCache = new Map()
  const materialCache = new Map()

  function geometry(typeID) {
    if (geometryCache.has(typeID)) return geometryCache.get(typeID)
    const t = typeMap.get(typeID)
    if (!t) throw new Error('Unknown brick type: ' + typeID)
    const w = t.w,
      d = t.d,
      h = t.h * 0.4,
      slope =
        String(t.kind).includes('slope') || String(t.id).includes('slope'),
      round = String(t.kind).includes('round') || String(t.id).includes('round')
    const pieces = []
    if (slope) pieces.push(slopeBody(w, d, h))
    else if (round) {
      const cylinder = new THREE.CylinderGeometry(0.465, 0.465, h - 0.065, 24)
      cylinder.translate(0, h / 2 + 0.005, 0)
      pieces.push(cylinder)
    } else pieces.push(roundedBody(w, d, h))
    for (let x = 0; x < w; x++)
      for (let z = 0; z < d; z++) {
        if (slope && z < d - 1) continue
        const stud = new THREE.CylinderGeometry(0.292, 0.3, 0.165, 16)
        stud.translate(x - (w - 1) / 2, h + 0.057, z - (d - 1) / 2)
        pieces.push(stud)
        const ring = new THREE.TorusGeometry(0.213, 0.012, 4, 16)
        ring.rotateX(Math.PI / 2)
        ring.translate(x - (w - 1) / 2, h + 0.145, z - (d - 1) / 2)
        pieces.push(ring)
      }
    const nonIndexed = pieces.map(p => (p.index ? p.toNonIndexed() : p))
    const merged = mergeGeometries(nonIndexed, false)
    merged.computeBoundingSphere()
    for (const p of new Set([...pieces, ...nonIndexed])) p.dispose()
    geometryCache.set(typeID, merged)
    return merged
  }
  function material(colorID, style = 'solid') {
    const key = colorID + ':' + style
    if (materialCache.has(key)) return materialCache.get(key)
    const color = colorMap.get(colorID)?.hex ?? colorID ?? '#dbb552'
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.34,
      metalness: 0,
    })
    if (style === 'guide') {
      m.transparent = true
      m.opacity = 0.105
      m.depthWrite = false
      m.roughness = 0.6
    }
    if (style === 'hint') {
      m.color.set(0xffcf4e)
      m.emissive.set(0xffb000)
      m.emissiveIntensity = 0.35
      m.transparent = true
      m.opacity = 0.57
      m.depthWrite = false
    }
    if (style === 'ghost-valid') {
      m.transparent = true
      m.opacity = 0.58
      m.depthWrite = false
      m.emissive.set(0x609b75)
      m.emissiveIntensity = 0.18
    }
    if (style === 'ghost-invalid') {
      m.color.set(0xee6658)
      m.transparent = true
      m.opacity = 0.56
      m.depthWrite = false
      m.emissive.set(0xee6658)
      m.emissiveIntensity = 0.15
    }
    if (style === 'correct') m.color.set(0x65b985)
    if (style === 'incorrect') m.color.set(0xe96d60)
    materialCache.set(key, m)
    return m
  }

  return {
    geometry,
    material,
    hasType: type => typeMap.has(type),
    dispose() {
      for (const resource of [...geometryCache.values(), ...materialCache.values()]) {
        resource.dispose()
      }
      geometryCache.clear()
      materialCache.clear()
    },
  }
}
