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

