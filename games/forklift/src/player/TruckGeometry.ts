import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

/** Rounded solid with analytic normals: flat panels meet genuinely curved edges. */
export function roundedSolid(name: string, size: readonly number[], radius: number, scene: Scene) {
  const half = size.map(v => v / 2);
  const r = Math.min(radius, ...half.map(v => v * .95));
  const core = half.map(v => v - r);
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  // Tiny tread blocks and chain links need only one bevel segment.
  const samples = (axis: number) => r <= .012
    ? [-half[axis], -core[axis], core[axis], half[axis]]
    : [-half[axis], -core[axis] - r * .75, -core[axis] - r * .4, -core[axis], core[axis], core[axis] + r * .4, core[axis] + r * .75, half[axis]];
  const count = samples(0).length;
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3, offset = positions.length / 3;
    for (const a of samples(u)) for (const b of samples(v)) {
      const p = [0, 0, 0]; p[axis] = sign * half[axis]; p[u] = a; p[v] = b;
      const c = p.map((value, i) => Math.max(-core[i], Math.min(core[i], value)));
      const n = new Vector3(p[0] - c[0], p[1] - c[1], p[2] - c[2]).normalize();
      positions.push(c[0] + n.x * r, c[1] + n.y * r, c[2] + n.z * r);
      normals.push(n.x, n.y, n.z);
    }
    for (let i = 0; i < count - 1; i++) for (let j = 0; j < count - 1; j++) {
      const a = offset + i * count + j, b = a + count;
      // Babylon's default front face uses clockwise winding.
      if (sign > 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const mesh = new Mesh(name, scene), data = new VertexData();
  data.positions = positions; data.normals = normals; data.indices = indices;
  data.uvs = Array(positions.length / 3 * 2).fill(0);
  data.applyToMesh(mesh);
  return mesh;
}

/** Extruded side profile for the forged, tapered forks. */
export function forgedFork(name: string, scene: Scene) {
  const profile = [[-.05, -.05], [2.35, -.05], [2.35, -.025], [2.05, .05], [.09, .05], [.025, .13], [.025, .95], [-.05, .95]];
  const positions: number[] = [], indices: number[] = [], normals: number[] = [];
  for (const x of [-.105, .105]) for (const [z, y] of profile) positions.push(x, y, z);
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    indices.push(i, j, i + 8, j, j + 8, i + 8);
  }
  // The concave L profile is split into the horizontal tine and vertical heel.
  const faces = [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 7, 5, 6, 7];
  for (let i = 0; i < faces.length; i += 3) indices.push(faces[i], faces[i + 2], faces[i + 1], faces[i] + 8, faces[i + 1] + 8, faces[i + 2] + 8);
  VertexData.ComputeNormals(positions, indices, normals);
  const mesh = new Mesh(name, scene), data = new VertexData();
  data.positions = positions; data.indices = indices; data.normals = normals;
  data.uvs = Array(positions.length / 3 * 2).fill(0);
  data.applyToMesh(mesh); mesh.convertToFlatShadedMesh();
  return mesh;
}
