import type { Board } from './board';

interface RouteStep {
  readonly to: string;
  readonly bit: bigint;
}

/** Longest trail of owned roads: vertices may repeat, but edges may not. */
export function longestRoute(
  board: Board,
  roads: Readonly<Record<string, number>>,
  buildings: Readonly<Record<string, { readonly owner: number }>>,
  player: number,
): number {
  const adjacent = new Map<string, RouteStep[]>();
  let edgeIndex = 0n;

  for (const edge of board.edges) {
    if (roads[edge.id] !== player) continue;
    const [first, second] = edge.vertices;
    const bit = 1n << edgeIndex;
    edgeIndex += 1n;
    adjacent.set(first, [...(adjacent.get(first) ?? []), { to: second, bit }]);
    adjacent.set(second, [...(adjacent.get(second) ?? []), { to: first, bit }]);
  }

  // Both graph and blockers are fixed during this call. Never retain a cache
  // between turns, when roads or an opponent's new settlement can change them.
  const memo = new Map<string, Map<bigint, number>>();

  const visit = (vertex: string, used: bigint): number => {
    const building = buildings[vertex];
    // An opponent's building may be an endpoint, including the starting one.
    if (used !== 0n && building !== undefined && building.owner !== player) {
      return 0;
    }

    let states = memo.get(vertex);
    const cached = states?.get(used);
    if (cached !== undefined) return cached;

    let longest = 0;
    for (const step of adjacent.get(vertex) ?? []) {
      if ((used & step.bit) !== 0n) continue;
      longest = Math.max(longest, 1 + visit(step.to, used | step.bit));
    }

    if (states === undefined) {
      states = new Map();
      memo.set(vertex, states);
    }
    states.set(used, longest);
    return longest;
  };

  let longest = 0;
  for (const vertex of adjacent.keys()) {
    longest = Math.max(longest, visit(vertex, 0n));
  }
  return longest;
}

/** Keep a tied qualifying holder; a tie among new leaders awards nobody. */
export function chooseRouteHolder(
  lengths: readonly number[],
  previous: number | null,
  threshold = 5,
): number | null {
  let longest = -Infinity;
  for (const length of lengths) longest = Math.max(longest, length);
  if (longest < threshold) return null;
  if (previous !== null && lengths[previous] === longest) return previous;

  let holder: number | null = null;
  for (const [player, length] of lengths.entries()) {
    if (length !== longest) continue;
    if (holder !== null) return null;
    holder = player;
  }
  return holder;
}
