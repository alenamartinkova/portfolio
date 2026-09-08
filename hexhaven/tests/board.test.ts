import { describe, expect, it } from 'vitest';
import {
  coastalEdges,
  createBoard,
  NUMBER_TOKENS,
  RESOURCES,
  validateBoard,
  type Board,
} from '../src/core/board';
import { cubeKey, hexNeighbors } from '../src/core/coords';
import { nextRandom, shuffle } from '../src/core/rng';

describe('board layouts', () => {
  it('uses one fixed, validated beginner board with the bandit home in the center', () => {
    const board = createBoard('beginner', 1);
    expect(validateBoard(board)).toEqual([]);
    expect(createBoard('beginner', 54321)).toEqual(board);
    expect(board.tiles.find((tile) => tile.terrain === 'desert')).toEqual({
      id: '0,0,0',
      coord: { q: 0, r: 0, s: 0 },
      terrain: 'desert',
      number: null,
    });
    expect(
      board.tiles
        .flatMap((tile) => (tile.number === null ? [] : [tile.number]))
        .sort((a, b) => a - b),
    ).toEqual(NUMBER_TOKENS);
  });

  it('reproduces randomized layouts from a seed', () => {
    expect(createBoard('random', 12345)).toEqual(createBoard('random', 12345));
    expect(createBoard('random', 12345).tiles).not.toEqual(createBoard('random', 12346).tiles);
  });

  it('validates randomized layouts across 100 seeds', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      expect(validateBoard(createBoard('random', seed)), `seed ${seed}`).toEqual([]);
    }
  });

  it('attaches nine harbours to distinct pairs of coastal vertices', () => {
    const board = createBoard('beginner', 0);
    const coast = coastalEdges(board);
    expect(coast).toHaveLength(30);
    expect(board.harbours).toHaveLength(9);
    expect(new Set(board.harbours.flatMap((harbour) => [...harbour.vertices])).size).toBe(18);
    expect(board.harbours.filter((harbour) => harbour.resource === null)).toHaveLength(4);
    for (const resource of RESOURCES)
      expect(board.harbours.filter((harbour) => harbour.resource === resource)).toHaveLength(1);
    for (const harbour of board.harbours) {
      expect(coast.some((edge) => edge.id === [...harbour.vertices].sort().join('~'))).toBe(true);
    }
  });

  it('rejects neighboring red numbers', () => {
    const board = createBoard('beginner', 0);
    const red = board.tiles.find((tile) => tile.number === 6);
    if (red === undefined) throw new Error('Fixture needs a red number.');
    const neighbors = hexNeighbors(red.coord).map(cubeKey);
    const adjacent = board.tiles.find(
      (tile) => neighbors.includes(tile.id) && tile.number !== null,
    );
    if (adjacent === undefined) throw new Error('Fixture needs an adjacent land tile.');
    const changed: Board = {
      ...board,
      tiles: board.tiles.map((tile) => (tile.id === adjacent.id ? { ...tile, number: 8 } : tile)),
    };
    expect(validateBoard(changed).some((error) => error.includes('touches another red'))).toBe(
      true,
    );
  });

  it('rejects three mutually adjacent tiles of the same terrain', () => {
    const board = createBoard('beginner', 0);
    const vertex = board.vertices.find((candidate) => candidate.hexes.length === 3);
    if (vertex === undefined) throw new Error('Fixture needs an inland vertex.');
    const changed: Board = {
      ...board,
      tiles: board.tiles.map((tile) =>
        vertex.hexes.includes(tile.id) ? { ...tile, terrain: 'forest' } : tile,
      ),
    };
    expect(validateBoard(changed).some((error) => error.includes('Three forest tiles'))).toBe(true);
  });

  it('rejects incorrect terrain and number distributions, missing topology, and overlapping harbours', () => {
    const board = createBoard('beginner', 0);
    expect(validateBoard({ ...board, tiles: board.tiles.slice(1) }).length).toBeGreaterThan(0);
    expect(validateBoard({ ...board, edges: board.edges.slice(1) }).length).toBeGreaterThan(0);
    const harbour = board.harbours[0];
    if (harbour === undefined) throw new Error('Fixture needs a harbour.');
    expect(
      validateBoard({ ...board, harbours: [...board.harbours, harbour] }).some((error) =>
        error.includes('share vertex'),
      ),
    ).toBe(true);
  });
});

describe('serialized randomness', () => {
  it('returns the same draw and next state for the same serialized input', () => {
    const first = nextRandom(1);
    expect(first).toEqual(nextRandom(1));
    expect(first.value).toBeGreaterThanOrEqual(0);
    expect(first.value).toBeLessThan(1);
    expect(first.rng).not.toBe(1);
    expect(nextRandom(first.rng)).not.toEqual(first);
    expect(nextRandom(0xffffffff).rng).toBeGreaterThanOrEqual(0);
  });

  it('shuffles without mutating or losing input values and preserves the RNG cursor', () => {
    const source = [1, 2, 3, 4, 5];
    const original = [...source];
    const result = shuffle(source, 32);
    expect(result).toEqual(shuffle(source, 32));
    expect([...result.items].sort()).toEqual(source);
    expect(source).toEqual(original);
    expect(result.rng).not.toBe(32);
    expect(shuffle([], 32)).toEqual({ items: [], rng: 32 });
    expect(shuffle([1], 32)).toEqual({ items: [1], rng: 32 });
  });
});
