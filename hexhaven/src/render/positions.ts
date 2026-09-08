import { Vector3 } from 'three';
import type { Board, Cube } from '../core/board';
import { cubeFromKey } from '../core/coords';

/** The single conversion from pointy-top cube coordinates to scene space. */
export function cubeToWorld(cube: Cube, out = new Vector3()): Vector3 {
  return out.set(Math.sqrt(3) * (cube.q + cube.r / 2), 0, 1.5 * cube.r);
}

export interface BoardPositions {
  readonly tiles: ReadonlyMap<string, Vector3>;
  readonly vertices: ReadonlyMap<string, Vector3>;
  readonly edges: ReadonlyMap<string, Vector3>;
  readonly all: ReadonlyMap<string, Vector3>;
}
export function createPositions(board: Board): BoardPositions {
  const tiles = new Map(board.tiles.map((tile) => [tile.id, cubeToWorld(tile.coord)]));
  const vertices = new Map<string, Vector3>();
  const scratch = new Vector3();
  for (const vertex of board.vertices) {
    const position = new Vector3();
    for (const hex of vertex.id.split('|')) position.add(cubeToWorld(cubeFromKey(hex), scratch));
    vertices.set(vertex.id, position.multiplyScalar(1 / 3));
  }
  const edges = new Map<string, Vector3>();
  for (const edge of board.edges) {
    const first = vertices.get(edge.vertices[0]);
    const second = vertices.get(edge.vertices[1]);
    if (first && second) edges.set(edge.id, first.clone().add(second).multiplyScalar(0.5));
  }
  return { tiles, vertices, edges, all: new Map([...tiles, ...vertices, ...edges]) };
}
