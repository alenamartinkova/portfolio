import {
  createTopology,
  cubeKey,
  hexCorners,
  hexEdges,
  hexNeighbors,
  LAND_HEX_COORDS,
  type BoardTopology,
  type Cube,
  type Edge,
  type HexId,
  type Vertex,
  type VertexId,
} from './coords';
import { shuffle } from './rng';

export type { Cube, Edge, HexId, Vertex, VertexId } from './coords';
export type Terrain = 'forest' | 'fields' | 'pasture' | 'hills' | 'mountains' | 'desert';
export type Resource = 'lumber' | 'grain' | 'wool' | 'brick' | 'ore';
export type Layout = 'beginner' | 'random';

export const RESOURCES: readonly Resource[] = ['lumber', 'grain', 'wool', 'brick', 'ore'];
export const TERRAIN_RESOURCE: Readonly<Record<Terrain, Resource | null>> = {
  forest: 'lumber',
  fields: 'grain',
  pasture: 'wool',
  hills: 'brick',
  mountains: 'ore',
  desert: null,
};

export interface Tile {
  readonly id: HexId;
  readonly coord: Cube;
  readonly terrain: Terrain;
  readonly number: number | null;
}

export interface Harbour {
  readonly id: string;
  readonly vertices: readonly [VertexId, VertexId];
  /** Null denotes the generic 3:1 harbour; resource harbours exchange at 2:1. */
  readonly resource: Resource | null;
}

export interface Board extends BoardTopology {
  readonly tiles: readonly Tile[];
  readonly vertices: readonly Vertex[];
  readonly edges: readonly Edge[];
  readonly harbours: readonly Harbour[];
}

const TERRAIN_COUNTS: Readonly<Record<Terrain, number>> = {
  forest: 4,
  fields: 4,
  pasture: 4,
  hills: 3,
  mountains: 3,
  desert: 1,
};
export const NUMBER_TOKENS: readonly number[] = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
];
const BEGINNER_TERRAINS: readonly Terrain[] = [
  'forest',
  'pasture',
  'fields',
  'mountains',
  'hills',
  'forest',
  'pasture',
  'fields',
  'pasture',
  'desert',
  'mountains',
  'hills',
  'mountains',
  'fields',
  'hills',
  'forest',
  'forest',
  'pasture',
  'fields',
];
const BEGINNER_NUMBERS: readonly (number | null)[] = [
  6,
  3,
  11,
  4,
  9,
  5,
  8,
  10,
  2,
  null,
  10,
  4,
  6,
  3,
  9,
  12,
  11,
  5,
  8,
];

function isRed(number: number | null): boolean {
  return number === 6 || number === 8;
}

/** Walk the coastline by connectivity so harbour ordering uses no world-space math. */
export function coastalEdges(topology: BoardTopology): readonly Edge[] {
  const vertexById = new Map(topology.vertices.map((vertex) => [vertex.id, vertex]));
  const coast = topology.edges.filter((edge) => {
    const first = vertexById.get(edge.vertices[0]);
    const second = vertexById.get(edge.vertices[1]);
    return (
      first !== undefined &&
      second !== undefined &&
      first.hexes.filter((id) => second.hexes.includes(id)).length === 1
    );
  });
  const first = coast[0];
  if (first === undefined) return [];
  const ordered: Edge[] = [first];
  const used = new Set([first.id]);
  let tip = first.vertices[1];
  while (ordered.length < coast.length) {
    const next = coast.find((edge) => !used.has(edge.id) && edge.vertices.includes(tip));
    if (next === undefined) throw new RangeError('The coastline must form a continuous ring.');
    used.add(next.id);
    ordered.push(next);
    tip = next.vertices[0] === tip ? next.vertices[1] : next.vertices[0];
  }
  return ordered;
}

function createHarbours(topology: BoardTopology): readonly Harbour[] {
  const coast = coastalEdges(topology);
  const types: readonly (Resource | null)[] = [
    null,
    'lumber',
    null,
    'grain',
    'wool',
    null,
    'brick',
    null,
    'ore',
  ];
  return types.map((resource, index) => {
    const edge = coast[Math.floor((index * coast.length) / types.length)];
    if (edge === undefined) throw new RangeError('Cannot attach a harbour without a coastline.');
    return { id: `harbour-${index + 1}`, vertices: edge.vertices, resource };
  });
}

function makeBoard(terrains: readonly Terrain[], numbers: readonly (number | null)[]): Board {
  const topology = createTopology();
  const tiles = LAND_HEX_COORDS.map((coord, index): Tile => {
    const terrain = terrains[index];
    const number = numbers[index];
    if (terrain === undefined || number === undefined)
      throw new RangeError('A board needs 19 terrain and token entries.');
    return { id: cubeKey(coord), coord, terrain, number };
  });
  return { tiles, ...topology, harbours: createHarbours(topology) };
}

export function createBoard(layout: Layout, seed: number): Board {
  if (layout === 'beginner') return makeBoard(BEGINNER_TERRAINS, BEGINNER_NUMBERS);
  let rng = seed >>> 0;
  for (let attempt = 0; attempt < 100_000; attempt += 1) {
    const terrains = shuffle(BEGINNER_TERRAINS, rng);
    const numbers = shuffle(NUMBER_TOKENS, terrains.rng);
    rng = numbers.rng;
    let tokenIndex = 0;
    const assigned = terrains.items.map((terrain) => {
      if (terrain === 'desert') return null;
      const number = numbers.items[tokenIndex];
      tokenIndex += 1;
      if (number === undefined) throw new RangeError('Missing number token.');
      return number;
    });
    const board = makeBoard(terrains.items, assigned);
    if (validateBoard(board).length === 0) return board;
  }
  throw new RangeError('Could not generate a valid board within 100,000 attempts.');
}

export function validateBoard(board: Board): string[] {
  const errors: string[] = [];
  const tiles = new Map(board.tiles.map((tile) => [tile.id, tile]));
  if (board.tiles.length !== 19 || tiles.size !== 19)
    errors.push('A board needs exactly 19 distinct land tiles.');
  if (
    board.vertices.length !== 54 ||
    new Set(board.vertices.map((vertex) => vertex.id)).size !== 54
  ) {
    errors.push('A board needs exactly 54 distinct land vertices.');
  }
  if (board.edges.length !== 72 || new Set(board.edges.map((edge) => edge.id)).size !== 72) {
    errors.push('A board needs exactly 72 distinct land edges.');
  }
  for (const terrain of Object.keys(TERRAIN_COUNTS) as Terrain[]) {
    if (board.tiles.filter((tile) => tile.terrain === terrain).length !== TERRAIN_COUNTS[terrain]) {
      errors.push(`Incorrect number of ${terrain} tiles.`);
    }
  }
  const tokens = board.tiles
    .flatMap((tile) => (tile.number === null ? [] : [tile.number]))
    .sort((a, b) => a - b);
  if (tokens.join(',') !== NUMBER_TOKENS.join(','))
    errors.push('Number tokens do not match the required distribution.');
  const vertices = new Set(board.vertices.map((vertex) => vertex.id));
  const edges = new Set(board.edges.map((edge) => edge.id));
  for (const tile of board.tiles) {
    if (tile.id !== cubeKey(tile.coord))
      errors.push(`Tile ${tile.id} has inconsistent coordinates.`);
    if ((tile.terrain === 'desert') !== (tile.number === null))
      errors.push(`Tile ${tile.id} has an invalid number token.`);
    if (hexCorners(tile.coord).some((id) => !vertices.has(id)))
      errors.push(`Tile ${tile.id} has missing corners.`);
    if (hexEdges(tile.coord).some((id) => !edges.has(id)))
      errors.push(`Tile ${tile.id} has missing edges.`);
    if (
      isRed(tile.number) &&
      hexNeighbors(tile.coord).some((coord) => {
        const neighbor = tiles.get(cubeKey(coord));
        return neighbor !== undefined && isRed(neighbor.number);
      })
    )
      errors.push(`Red number on ${tile.id} touches another red number.`);
  }
  for (const vertex of board.vertices) {
    const adjacent = vertex.hexes.map((id) => tiles.get(id));
    if (adjacent.some((tile) => tile === undefined) || adjacent.length < 1 || adjacent.length > 3) {
      errors.push(`Vertex ${vertex.id} has invalid land adjacency.`);
    }
    if (adjacent.length === 3) {
      const terrain = adjacent[0]?.terrain;
      if (terrain !== undefined && adjacent.every((tile) => tile?.terrain === terrain)) {
        errors.push(`Three ${terrain} tiles meet at ${vertex.id}.`);
      }
      if (adjacent.every((tile) => tile !== undefined && isRed(tile.number))) {
        errors.push(`Three red numbers meet at ${vertex.id}.`);
      }
    }
  }
  if (board.harbours.length !== 9) errors.push('A board needs nine harbours.');
  if (board.harbours.filter((harbour) => harbour.resource === null).length !== 4)
    errors.push('A board needs four generic harbours.');
  for (const resource of RESOURCES) {
    if (board.harbours.filter((harbour) => harbour.resource === resource).length !== 1)
      errors.push(`A board needs one ${resource} harbour.`);
  }
  const coast = new Set(coastalEdges(board).map((edge) => edge.id));
  const harbourVertices = new Set<VertexId>();
  for (const harbour of board.harbours) {
    if (!coast.has([...harbour.vertices].sort().join('~')))
      errors.push(`Harbour ${harbour.id} is not on a coastal edge.`);
    for (const vertex of harbour.vertices) {
      if (harbourVertices.has(vertex)) errors.push(`Harbours share vertex ${vertex}.`);
      harbourVertices.add(vertex);
    }
  }
  return errors;
}
