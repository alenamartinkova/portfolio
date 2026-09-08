import { describe, expect, it } from 'vitest';
import type { Board, Edge } from '../src/core/board';
import { chooseRouteHolder, longestRoute } from '../src/core/route';

type Buildings = Readonly<Record<string, { readonly owner: number }>>;

function graph(...pairs: readonly (readonly [string, string])[]): Board {
  const edges: Edge[] = pairs.map((vertices, index) => ({ id: `e${index}`, vertices }));
  const ids = new Set(pairs.flatMap(([first, second]) => [first, second]));
  return {
    tiles: [],
    harbours: [],
    edges,
    vertices: [...ids].map((id) => {
      const touching = edges.filter((edge) => edge.vertices.includes(id));
      return {
        id,
        hexes: [],
        edges: touching.map((edge) => edge.id),
        neighbors: touching.map((edge) =>
          edge.vertices[0] === id ? edge.vertices[1] : edge.vertices[0],
        ),
      };
    }),
  };
}

function owned(board: Board, player = 0): Record<string, number> {
  const roads: Record<string, number> = {};
  for (const edge of board.edges) roads[edge.id] = player;
  return roads;
}

/** Separate reference search: remove edges from arrays and start on each edge. */
function bruteForce(
  board: Board,
  roads: Readonly<Record<string, number>>,
  buildings: Buildings,
  player: number,
): number {
  const edges = board.edges.filter((edge) => roads[edge.id] === player);
  const extend = (tip: string, remaining: readonly Edge[], length: number): number => {
    const building = buildings[tip];
    if (building !== undefined && building.owner !== player) return length;
    let best = length;
    for (const edge of remaining) {
      const [first, second] = edge.vertices;
      if (first !== tip && second !== tip) continue;
      best = Math.max(
        best,
        extend(
          first === tip ? second : first,
          remaining.filter((candidate) => candidate.id !== edge.id),
          length + 1,
        ),
      );
    }
    return best;
  };
  let best = 0;
  for (const edge of edges) {
    const remaining = edges.filter((candidate) => candidate.id !== edge.id);
    for (const tip of edge.vertices) best = Math.max(best, extend(tip, remaining, 1));
  }
  return best;
}

describe('longestRoute', () => {
  it('counts a straight route and returns zero without owned roads', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f']);
    expect(longestRoute(board, owned(board), {}, 0)).toBe(5);
    expect(longestRoute(board, owned(board), {}, 1)).toBe(0);
    expect(longestRoute(graph(), {}, {}, 0)).toBe(0);
  });

  it('takes only two arms of a fork', () => {
    const board = graph(['o', 'a'], ['a', 'b'], ['o', 'c'], ['c', 'd'], ['o', 'e'], ['e', 'f']);
    expect(longestRoute(board, owned(board), {}, 0)).toBe(4);
  });

  it('counts a complete cycle and a tail without reusing an edge', () => {
    const cycle = graph(['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']);
    expect(longestRoute(cycle, owned(cycle), {}, 0)).toBe(4);
    const board = graph(...cycle.edges.map((edge) => edge.vertices), ['a', 'x'], ['x', 'y']);
    expect(longestRoute(board, owned(board), {}, 0)).toBe(6);
  });

  it('can revisit the shared vertex of a figure eight', () => {
    const board = graph(['o', 'a'], ['a', 'b'], ['b', 'o'], ['o', 'c'], ['c', 'd'], ['d', 'o']);
    expect(longestRoute(board, owned(board), {}, 0)).toBe(6);
  });

  it('allows own buildings and splits routes at an opponent building', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'g']);
    expect(longestRoute(board, owned(board), { d: { owner: 0 } }, 0)).toBe(6);
    expect(longestRoute(board, owned(board), { d: { owner: 1 } }, 0)).toBe(3);
    expect(longestRoute(board, owned(board), { a: { owner: 1 } }, 0)).toBe(6);
  });

  it('can start and finish at a blocker on a cycle, but cannot pass a second blocker', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']);
    expect(longestRoute(board, owned(board), { a: { owner: 1 } }, 0)).toBe(4);
    expect(longestRoute(board, owned(board), { a: { owner: 1 }, c: { owner: 1 } }, 0)).toBe(2);
  });

  it('ignores other owners and unknown edge ids, taking the longest connected part', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'd'], ['x', 'y'], ['y', 'z']);
    expect(longestRoute(board, { e0: 0, e1: 1, e2: 0, e3: 0, e4: 0, unknown: 0 }, {}, 0)).toBe(2);
  });

  it('keeps memoization local when ownership or buildings change between calls', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'd']);
    const roads = owned(board);
    expect(longestRoute(board, roads, {}, 0)).toBe(3);
    roads.e1 = 1;
    expect(longestRoute(board, roads, {}, 0)).toBe(1);
    roads.e1 = 0;
    expect(longestRoute(board, roads, { b: { owner: 1 } }, 0)).toBe(2);
    expect(longestRoute(board, roads, {}, 0)).toBe(3);
  });

  it('does not mutate its board, roads, or buildings', () => {
    const board = graph(['a', 'b'], ['b', 'c'], ['c', 'a']);
    const roads = owned(board);
    const buildings = { b: { owner: 1 } };
    const before = structuredClone({ board, roads, buildings });
    longestRoute(board, roads, buildings, 0);
    expect({ board, roads, buildings }).toEqual(before);
  });

  it('does not alias visited edges beyond the 32-bit mask boundary', () => {
    const pairs: [string, string][] = Array.from({ length: 40 }, (_, index) => [
      `v${index}`,
      `v${index + 1}`,
    ]);
    const board = graph(...pairs);
    expect(longestRoute(board, owned(board), {}, 0)).toBe(40);
  });

  it('matches an independent exhaustive search on seeded small graphs', () => {
    let seed = 0x5eed1234;
    const random = (): number => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x1_0000_0000;
    };

    for (let sample = 0; sample < 250; sample += 1) {
      const vertices = 2 + Math.floor(random() * 6);
      const pairs: [string, string][] = [];
      for (let first = 0; first < vertices; first += 1) {
        for (let second = first + 1; second < vertices; second += 1) {
          if (random() < 0.45 && pairs.length < 9) pairs.push([`v${first}`, `v${second}`]);
        }
      }
      const board = graph(...pairs);
      const roads: Record<string, number> = {};
      const buildings: Record<string, { readonly owner: number }> = {};
      for (const edge of board.edges) {
        const roll = random();
        if (roll < 0.9) roads[edge.id] = roll < 0.6 ? 0 : 1;
      }
      for (const vertex of board.vertices) {
        const roll = random();
        if (roll < 0.35) buildings[vertex.id] = { owner: roll < 0.15 ? 0 : 1 };
      }
      for (const player of [0, 1]) {
        expect(
          longestRoute(board, roads, buildings, player),
          `sample ${sample}, player ${player}`,
        ).toBe(bruteForce(board, roads, buildings, player));
      }
    }
  });
});

describe('chooseRouteHolder', () => {
  it('requires the threshold, even for the prior holder', () => {
    expect(chooseRouteHolder([], null)).toBeNull();
    expect(chooseRouteHolder([4, 2, 3], null)).toBeNull();
    expect(chooseRouteHolder([4, 2, 3], 0)).toBeNull();
    expect(chooseRouteHolder([5, 4, 3], null)).toBe(0);
  });

  it('awards a unique leader and transfers to a strictly longer route', () => {
    expect(chooseRouteHolder([5, 6, 4], null)).toBe(1);
    expect(chooseRouteHolder([5, 6, 4], 0)).toBe(1);
  });

  it('retains a qualifying holder tied for the lead', () => {
    expect(chooseRouteHolder([6, 6, 4], 0)).toBe(0);
    expect(chooseRouteHolder([6, 6, 4], 1)).toBe(1);
  });

  it('awards nobody on a tie without a still-qualifying tied holder', () => {
    expect(chooseRouteHolder([6, 6, 4], null)).toBeNull();
    expect(chooseRouteHolder([6, 6, 4], 2)).toBeNull();
    expect(chooseRouteHolder([7, 7, 6], 2)).toBeNull();
  });

  it('supports the guard-award threshold with the same tie rules', () => {
    expect(chooseRouteHolder([2, 1, 0], null, 3)).toBeNull();
    expect(chooseRouteHolder([3, 1, 0], null, 3)).toBe(0);
    expect(chooseRouteHolder([3, 3, 0], 1, 3)).toBe(1);
    expect(chooseRouteHolder([3, 3, 0], null, 3)).toBeNull();
  });
});
