import { TERRAIN_RESOURCE, type Resource } from '../core/board';
import { canPlaceVillage } from '../core/legal';
import { publicVP } from '../core/scoring';
import {
  COSTS,
  getPlayer,
  piecesLeft,
  RESOURCES,
  resourceMap,
  type GameState,
  type ResourceMap,
} from '../core/state';

export type BuildTarget = keyof typeof COSTS;
export interface Expansion {
  readonly vertex: string;
  readonly firstEdge: string | null;
  readonly distance: number;
  readonly score: number;
}
export interface Evaluation {
  readonly production: ResourceMap;
  readonly expansions: readonly Expansion[];
  readonly target: BuildTarget;
  readonly vertexScores: ReadonlyMap<string, number>;
}

export const pipWeight = (number: number | null): number =>
  number === null || number === 7 ? 0 : Math.max(0, 6 - Math.abs(7 - number));
export const resourceDeficit = (hand: ResourceMap, cost: ResourceMap): number =>
  RESOURCES.reduce((sum, resource) => sum + Math.max(0, cost[resource] - hand[resource]), 0);

export function productionProfile(state: GameState, player: number): ResourceMap {
  const production: Record<Resource, number> = { ...resourceMap() };
  const tiles = new Map(state.board.tiles.map((tile) => [tile.id, tile]));
  for (const vertex of state.board.vertices) {
    const building = state.buildings[vertex.id];
    if (building?.owner !== player) continue;
    for (const id of vertex.hexes) {
      const tile = tiles.get(id);
      const resource = tile === undefined ? null : TERRAIN_RESOURCE[tile.terrain];
      if (resource !== null && tile !== undefined)
        production[resource] += pipWeight(tile.number) * (building.kind === 'town' ? 2 : 1);
    }
  }
  return production;
}

export function vertexScore(
  state: GameState,
  player: number,
  vertexId: string,
  production = productionProfile(state, player),
): number {
  const vertex = state.board.vertices.find((candidate) => candidate.id === vertexId);
  if (vertex === undefined) return -Infinity;
  const difficulty = getPlayer(state, player).difficulty;
  const foresight = difficulty === 'hard' ? 1.2 : difficulty === 'easy' ? 0.45 : 1;
  const diversity = new Set<Resource>();
  let score = 0;
  for (const id of vertex.hexes) {
    const tile = state.board.tiles.find((candidate) => candidate.id === id);
    const resource = tile === undefined ? null : TERRAIN_RESOURCE[tile.terrain];
    if (tile === undefined || resource === null) continue;
    diversity.add(resource);
    const strategic = resource === 'ore' ? 1.16 : resource === 'grain' ? 1.12 : 1;
    score +=
      pipWeight(tile.number) * strategic * (1 + (foresight * 2.8) / (production[resource] + 2.8));
  }
  score += diversity.size * 0.8;
  for (const resource of diversity) if (production[resource] === 0) score += 1.6 * foresight;
  const harbour = state.board.harbours.find((candidate) => candidate.vertices.includes(vertexId));
  if (harbour !== undefined)
    score += harbour.resource === null ? 1.7 : 0.6 + Math.min(3, production[harbour.resource] / 4);
  score += vertex.neighbors.filter((id) => state.buildings[id] === undefined).length * 0.25;
  return score;
}

export function expansionPlans(
  state: GameState,
  player: number,
  vertexScores: ReadonlyMap<string, number>,
): readonly Expansion[] {
  const vertices = new Map(state.board.vertices.map((vertex) => [vertex.id, vertex]));
  const edges = new Map(state.board.edges.map((edge) => [edge.id, edge]));
  const distance = new Map<string, number>();
  const firstEdge = new Map<string, string | null>();
  const pending = new Set<string>();
  for (const vertex of state.board.vertices) {
    const building = state.buildings[vertex.id];
    if (building !== undefined && building.owner !== player) continue;
    if (building?.owner === player || vertex.edges.some((edge) => state.roads[edge] === player)) {
      distance.set(vertex.id, 0);
      firstEdge.set(vertex.id, null);
      pending.add(vertex.id);
    }
  }
  while (pending.size > 0) {
    let current: string | undefined;
    let best = Infinity;
    for (const id of pending) {
      const candidate = distance.get(id) ?? Infinity;
      if (candidate < best) {
        best = candidate;
        current = id;
      }
    }
    if (current === undefined) break;
    pending.delete(current);
    const vertex = vertices.get(current);
    if (vertex === undefined) continue;
    for (const edgeId of vertex.edges) {
      const owner = state.roads[edgeId];
      if (owner !== undefined && owner !== player) continue;
      const edge = edges.get(edgeId);
      if (edge === undefined) continue;
      const next = edge.vertices[0] === current ? edge.vertices[1] : edge.vertices[0];
      const building = state.buildings[next];
      if (building !== undefined && building.owner !== player) continue;
      const nextDistance = best + (owner === player ? 0 : 1);
      if (nextDistance >= (distance.get(next) ?? Infinity)) continue;
      distance.set(next, nextDistance);
      firstEdge.set(next, firstEdge.get(current) ?? (owner === undefined ? edgeId : null));
      pending.add(next);
    }
  }
  const remaining = piecesLeft(state, player).roads;
  return state.board.vertices
    .flatMap((vertex): Expansion[] => {
      const steps = distance.get(vertex.id);
      if (
        steps === undefined ||
        steps > remaining ||
        !canPlaceVillage(state, player, vertex.id, true)
      )
        return [];
      return [
        {
          vertex: vertex.id,
          firstEdge: firstEdge.get(vertex.id) ?? null,
          distance: steps,
          score: vertexScores.get(vertex.id) ?? 0,
        },
      ];
    })
    .sort(
      (first, second) =>
        second.score / (1 + second.distance * 0.9) - first.score / (1 + first.distance * 0.9),
    );
}

export function targetBuild(
  state: GameState,
  player: number,
  expansions: readonly Expansion[],
  production: ResourceMap,
): BuildTarget {
  const person = getPlayer(state, player);
  const pieces = piecesLeft(state, player);
  const villages = Object.values(state.buildings).filter(
    (building) => building.owner === player && building.kind === 'village',
  ).length;
  const choices: { kind: BuildTarget; priority: number }[] = [];
  if (pieces.towns > 0 && villages > 0) choices.push({ kind: 'town', priority: 1.05 });
  if (pieces.villages > 0 && expansions.some((plan) => plan.distance === 0))
    choices.push({ kind: 'village', priority: 0.88 });
  if (pieces.roads > 0 && pieces.villages > 0 && expansions.some((plan) => plan.distance > 0))
    choices.push({ kind: 'road', priority: 1.25 });
  if (state.deckIndex < state.deck.length) choices.push({ kind: 'dev', priority: 1.6 });
  let best: BuildTarget = 'town';
  let bestScore = Infinity;
  for (const choice of choices) {
    const cost = COSTS[choice.kind];
    const wait = RESOURCES.reduce(
      (sum, resource) =>
        sum +
        Math.max(0, cost[resource] - person.hand[resource]) * (1 + 2 / (production[resource] + 2)),
      0,
    );
    const score = (wait + (choice.kind === 'road' ? 1.4 : 0.3)) * choice.priority;
    if (score < bestScore) {
      bestScore = score;
      best = choice.kind;
    }
  }
  return best;
}

export function evaluatePosition(state: GameState, player: number): Evaluation {
  const production = productionProfile(state, player);
  const vertexScores = new Map(
    state.board.vertices.map((vertex) => [
      vertex.id,
      vertexScore(state, player, vertex.id, production),
    ]),
  );
  const expansions = expansionPlans(state, player, vertexScores);
  return {
    production,
    vertexScores,
    expansions,
    target: targetBuild(state, player, expansions, production),
  };
}

export function tradeImprovement(
  state: GameState,
  player: number,
  give: ResourceMap,
  want: ResourceMap,
  target: BuildTarget,
): number {
  const hand = getPlayer(state, player).hand;
  const after = Object.fromEntries(
    RESOURCES.map((resource) => [resource, hand[resource] - give[resource] + want[resource]]),
  ) as ResourceMap;
  if (RESOURCES.some((resource) => after[resource] < 0)) return -Infinity;
  return resourceDeficit(hand, COSTS[target]) - resourceDeficit(after, COSTS[target]);
}

export function feedsWinningBuild(
  state: GameState,
  opponent: number,
  give: ResourceMap,
  want: ResourceMap,
): boolean {
  if (publicVP(state, opponent) < 9) return false;
  const hand = getPlayer(state, opponent).hand;
  return (['town', 'village', 'dev'] as const).some((target) =>
    RESOURCES.every(
      (resource) => hand[resource] + give[resource] - want[resource] >= COSTS[target][resource],
    ),
  );
}
