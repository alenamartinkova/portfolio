import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { roundedSolidData } from '../../../../shared/rounded-solid-data.js';
import type { Scene } from '@babylonjs/core/scene';

/** Rounded solid with analytic normals: flat panels meet genuinely curved edges. */
export function roundedSolid(name: string, size: readonly number[], radius: number, scene: Scene) {
  const mesh = new Mesh(name, scene), data = new VertexData();
  Object.assign(data, roundedSolidData(scene, size, radius));
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
