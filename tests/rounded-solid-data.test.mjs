import test from 'node:test'
import assert from 'node:assert/strict'
import { roundedSolidData } from '../shared/rounded-solid-data.js'
import { buildRoundedSolid } from '../scripts/lib/rounded-solid-reference.mjs'

test('offline templates reproduce the original geometry across dimensions and clamped radii', () => {
  const scene = { onDisposeObservable: { addOnce() {} } }
  for (const size of [[2, 1, 3], [.025, 8, .05], [35, .32, .24], [.004, .008, .016]]) {
    for (const radius of [.001, .008, .012, .0121, .04, 1]) {
      const expected = buildRoundedSolid(size, radius), actual = roundedSolidData(scene, size, radius)
      assert.deepEqual(actual.indices, expected.indices)
      assert.deepEqual(actual.uvs, expected.uvs)
      for (const key of ['positions', 'normals'])
        for (let i = 0; i < expected[key].length; i++)
          assert.ok(Math.abs(actual[key][i] - expected[key][i]) < 1e-10, `${size}/${radius}/${key}/${i}`)
    }
  }
})

test('cached solids preserve dimensions, normals and winding for small and large bevels', () => {
  const scene = { onDisposeObservable: { addOnce() {} } }
  for (const radius of [.008, .04]) {
    const size = [2, 1, 3], data = roundedSolidData(scene, size, radius)
    const count = radius <= .012 ? 4 : 6
    assert.equal(data.positions.length / 3, 6 * count * count)
    for (let i = 0; i < data.positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(data.positions[i + axis]) <= size[axis] / 2 + 1e-12)
      assert.ok(Math.abs(Math.hypot(...data.normals.slice(i, i + 3)) - 1) < 1e-12)
    }
    for (let i = 0; i < data.indices.length; i += 3) {
      const [a, b, c] = data.indices.slice(i, i + 3).map(index => data.positions.slice(index * 3, index * 3 + 3))
      const u = b.map((v, j) => v - a[j]), v = c.map((value, j) => value - a[j])
      const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
      const normal = data.normals.slice(data.indices[i] * 3, data.indices[i] * 3 + 3)
      assert.ok(cross.reduce((sum, value, j) => sum + value * normal[j], 0) <= 1e-12, 'Babylon clockwise winding')
    }
  }
})

test('baking and UV edits cannot corrupt other meshes or cached templates', () => {
  let dispose
  const scene = { onDisposeObservable: { addOnce(fn) { dispose = fn } } }
  const original = roundedSolidData(scene, [2, 1, 3], .04)
  const changed = roundedSolidData(scene, [2, 1, 3], .04)
  for (const array of Object.values(changed)) array.fill(999)
  assert.deepEqual(roundedSolidData(scene, [2, 1, 3], .04), original)
  dispose()
  assert.deepEqual(roundedSolidData(scene, [2, 1, 3], .04), original)
  assert.notDeepEqual(roundedSolidData(scene, [3, 1, 3], .04).positions, original.positions)
})
