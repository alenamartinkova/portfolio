export interface Cube {
  readonly q: number;
  readonly r: number;
  readonly s: number;
}

export type HexId = string;
export type VertexId = string;
type EdgeId = string;

export interface Vertex {
  readonly id: VertexId;
  /** Actual land tiles; the id also includes the virtual sea tiles. */
  readonly hexes: readonly HexId[];
  readonly neighbors: readonly VertexId[];
  readonly edges: readonly EdgeId[];
}

export interface Edge {
  readonly id: EdgeId;
  readonly vertices: readonly [VertexId, VertexId];
}

export interface BoardTopology {
  readonly vertices: readonly Vertex[];
  readonly edges: readonly Edge[];
}

const DIRECTIONS: readonly Cube[] = [
  { q: 1, r: 0, s: -1 },
  { q: 1, r: -1, s: 0 },
  { q: 0, r: -1, s: 1 },
  { q: -1, r: 0, s: 1 },
  { q: -1, r: 1, s: 0 },
  { q: 0, r: 1, s: -1 },
];

export function cubeKey(cube: Cube): HexId {
  if (
    !Number.isInteger(cube.q) ||
    !Number.isInteger(cube.r) ||
    !Number.isInteger(cube.s) ||
    cube.q + cube.r + cube.s !== 0
  ) {
    throw new RangeError('Cube coordinates must be integers adding up to zero.');
  }
  return `${cube.q},${cube.r},${cube.s}`;
}

export function cubeFromKey(id: HexId): Cube {
  const parts = id.split(',');
  if (parts.length !== 3 || parts.some((part) => !/^-?\d+$/.test(part))) {
    throw new RangeError(`Invalid hex id: ${id}`);
  }
  const q = Number(parts[0]);
  const r = Number(parts[1]);
  const s = Number(parts[2]);
  const cube: Cube = { q, r, s };
  cubeKey(cube);
  return cube;
}

export function hexNeighbors(cube: Cube): readonly Cube[] {
  cubeKey(cube);
  return DIRECTIONS.map((direction) => ({
    q: cube.q + direction.q,
    r: cube.r + direction.r,
    s: cube.s + direction.s,
  }));
}

/** Clockwise corners, starting between the east and northeast neighbors. */
export function hexCorners(cube: Cube): readonly VertexId[] {
  const center = cubeKey(cube);
  const neighbors = hexNeighbors(cube).map(cubeKey);
  return neighbors.map((neighbor, index) => {
    const next = neighbors[(index + 1) % neighbors.length];
    if (next === undefined) throw new RangeError('A hex must have six neighbors.');
    return [center, neighbor, next].sort().join('|');
  });
}

function edgeKey(first: VertexId, second: VertexId): EdgeId {
  return [first, second].sort().join('~');
}

export function hexEdges(cube: Cube): readonly EdgeId[] {
  const corners = hexCorners(cube);
  return corners.map((corner, index) => {
    const next = corners[(index + 1) % corners.length];
    if (next === undefined) throw new RangeError('A hex must have six corners.');
    return edgeKey(corner, next);
  });
}

export function hexDisk(radius: number): readonly Cube[] {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new RangeError('Hex radius must be a nonnegative integer.');
  }
  const cubes: Cube[] = [];
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r += 1) {
      cubes.push({ q: q || 0, r: r || 0, s: -q - r || 0 });
    }
  }
  return cubes;
}

export const LAND_HEX_COORDS: readonly Cube[] = hexDisk(2);

export function createTopology(cubes: readonly Cube[] = LAND_HEX_COORDS): BoardTopology {
  const vertices = new Map<
    VertexId,
    { hexes: Set<HexId>; neighbors: Set<VertexId>; edges: Set<EdgeId> }
  >();
  const edges = new Map<EdgeId, Edge>();
  for (const cube of cubes) {
    const hex = cubeKey(cube);
    const corners = hexCorners(cube);
    for (const corner of corners) {
      let vertex = vertices.get(corner);
      if (vertex === undefined) {
        vertex = { hexes: new Set(), neighbors: new Set(), edges: new Set() };
        vertices.set(corner, vertex);
      }
      vertex.hexes.add(hex);
    }
    corners.forEach((corner, index) => {
      const next = corners[(index + 1) % corners.length];
      if (next === undefined) throw new RangeError('A hex must have six corners.');
      const id = edgeKey(corner, next);
      const pair: readonly [VertexId, VertexId] = corner < next ? [corner, next] : [next, corner];
      edges.set(id, { id, vertices: pair });
      const first = vertices.get(corner);
      const second = vertices.get(next);
      if (first === undefined || second === undefined)
        throw new RangeError('Missing edge endpoint.');
      first.edges.add(id);
      first.neighbors.add(next);
      second.edges.add(id);
      second.neighbors.add(corner);
    });
  }
  return {
    vertices: [...vertices.entries()]
      .sort(([first], [second]) => (first < second ? -1 : first > second ? 1 : 0))
      .map(([id, vertex]) => ({
        id,
        hexes: [...vertex.hexes].sort(),
        neighbors: [...vertex.neighbors].sort(),
        edges: [...vertex.edges].sort(),
      })),
    edges: [...edges.values()].sort((first, second) =>
      first.id < second.id ? -1 : first.id > second.id ? 1 : 0,
    ),
  };
}

function getVertex(board: BoardTopology, id: VertexId): Vertex {
  const vertex = board.vertices.find((candidate) => candidate.id === id);
  if (vertex === undefined) throw new RangeError(`Unknown vertex: ${id}`);
  return vertex;
}

export function vertexNeighbors(board: BoardTopology, id: VertexId): readonly VertexId[] {
  return getVertex(board, id).neighbors;
}

export function vertexEdges(board: BoardTopology, id: VertexId): readonly EdgeId[] {
  return getVertex(board, id).edges;
}

export function edgeVertices(board: BoardTopology, id: EdgeId): readonly [VertexId, VertexId] {
  const edge = board.edges.find((candidate) => candidate.id === id);
  if (edge === undefined) throw new RangeError(`Unknown edge: ${id}`);
  return edge.vertices;
}

export function vertexHexes(board: BoardTopology, id: VertexId): readonly HexId[] {
  return getVertex(board, id).hexes;
}
