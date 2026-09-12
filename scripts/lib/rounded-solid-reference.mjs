// Offline reference used to generate and verify the geometry templates. Never imported by games.
/** @param {readonly number[]} size @param {number} radius */
export function buildRoundedSolid(size, radius) {
  const half = size.map(v => v / 2)
  const r = Math.min(radius, ...half.map(v => v * .95))
  const core = half.map(v => v - r)
  const samples = half.map((h, axis) => r <= .012
    ? [-h, -core[axis], core[axis], h]
    : [-h, -core[axis] - r * .6, -core[axis], core[axis], core[axis] + r * .6, h])
  const count = samples[0].length
  const positions = [], normals = [], indices = []
  const p = [0, 0, 0]
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3, offset = positions.length / 3
    for (const a of samples[u]) for (const b of samples[v]) {
      p[axis] = sign * half[axis]; p[u] = a; p[v] = b
      const x = Math.max(-core[0], Math.min(core[0], p[0]))
      const y = Math.max(-core[1], Math.min(core[1], p[1]))
      const z = Math.max(-core[2], Math.min(core[2], p[2]))
      const dx = p[0] - x, dy = p[1] - y, dz = p[2] - z
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const inverse = length ? 1 / length : 0
      const nx = dx * inverse, ny = dy * inverse, nz = dz * inverse
      positions.push(x + nx * r, y + ny * r, z + nz * r)
      normals.push(nx, ny, nz)
    }
    for (let i = 0; i < count - 1; i++) for (let j = 0; j < count - 1; j++) {
      const a = offset + i * count + j, b = a + count
      if (sign > 0) indices.push(a, a + 1, b, a + 1, b + 1, b)
      else indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }
  return { positions, normals, indices, uvs: Array(positions.length / 3 * 2).fill(0) }
}
