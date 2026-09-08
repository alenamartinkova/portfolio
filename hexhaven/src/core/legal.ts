import type { Action } from './actions';
import { nextRandom } from './rng';
import { canAfford, COSTS, emptyTrade, getPlayer, handSize, piecesLeft, RESOURCES } from './state';
import type { GameState, TradeDraft } from './state';
import { tradeRatio, validBasket } from './trade';

const cache = new WeakMap<GameState, Map<number, readonly Action[]>>();

export function canPlaceVillage(
  state: GameState,
  player: number,
  vertexId: string,
  setup = false,
): boolean {
  const vertex = state.board.vertices.find((v) => v.id === vertexId);
  return (
    vertex !== undefined &&
    !state.buildings[vertexId] &&
    vertex.neighbors.every((id) => !state.buildings[id]) &&
    (setup || vertex.edges.some((id) => state.roads[id] === player))
  );
}
export function canPlaceRoad(state: GameState, player: number, edgeId: string): boolean {
  const edge = state.board.edges.find((e) => e.id === edgeId);
  if (!edge || state.roads[edgeId] !== undefined) return false;
  return edge.vertices.some((id) => {
    const building = state.buildings[id];
    if (building) return building.owner === player;
    return (
      state.board.vertices
        .find((v) => v.id === id)
        ?.edges.some((other) => state.roads[other] === player) ?? false
    );
  });
}
export function legalRoadEdges(state: GameState, player: number): string[] {
  if (piecesLeft(state, player).roads <= 0) return [];
  return state.board.edges.filter((e) => canPlaceRoad(state, player, e.id)).map((e) => e.id);
}
export function getActor(state: GameState): number {
  if (state.phase.type === 'discard')
    return (
      state.players.find(
        (p) => (state.phase.type === 'discard' ? (state.phase.pending[p.id] ?? 0) : 0) > 0,
      )?.id ?? state.activePlayer
    );
  if (state.tradeOffer) {
    const pending = state.players.find((p) => state.tradeOffer?.responses[p.id] === 'pending');
    if (pending) return pending.id;
  }
  return state.activePlayer;
}
function tradeEdits(state: GameState, player: number, draft: TradeDraft): Action[] {
  const hand = getPlayer(state, player).hand;
  const result: Action[] = [];
  for (const side of ['give', 'want'] as const)
    for (const resource of RESOURCES) {
      if (draft[side][resource] > 0)
        result.push({ type: 'editTrade', player, side, resource, delta: -1 });
      const limit = side === 'give' ? hand[resource] : 19;
      if (draft[side][resource] < limit && draft[side === 'give' ? 'want' : 'give'][resource] === 0)
        result.push({ type: 'editTrade', player, side, resource, delta: 1 });
    }
  return result;
}
function listActions(state: GameState, player: number): Action[] {
  if (!state.players[player] || state.phase.type === 'gameOver') return [];
  const person = getPlayer(state, player);
  const phase = state.phase;
  if (phase.type === 'discard')
    return (phase.pending[player] ?? 0) > 0
      ? RESOURCES.filter((r) => person.hand[r] > 0).map((resource) => ({
          type: 'discard',
          player,
          resource,
        }))
      : [];
  const offer = state.tradeOffer;
  if (offer) {
    if (player === state.activePlayer) {
      const actions: Action[] = [{ type: 'cancelTrade', player }];
      for (const [key, counter] of Object.entries(offer.counters)) {
        const opponent = Number(key);
        actions.push({ type: 'declineCounter', player, opponent });
        if (
          canAfford(person.hand, counter.want) &&
          canAfford(getPlayer(state, opponent).hand, counter.give)
        )
          actions.push({ type: 'acceptCounter', player, opponent });
      }
      return actions;
    }
    if (offer.responses[player] !== 'pending') return [];
    const draft = state.tradeDrafts[player] ?? emptyTrade();
    const actions = tradeEdits(state, player, draft);
    actions.push({ type: 'respondTrade', player, response: 'decline' });
    if (
      canAfford(person.hand, offer.want) &&
      canAfford(getPlayer(state, offer.proposer).hand, offer.give)
    )
      actions.push({ type: 'respondTrade', player, response: 'accept' });
    if (validBasket(draft, person.hand))
      actions.push({ type: 'respondTrade', player, response: 'counter' });
    return actions;
  }
  if (player !== state.activePlayer) return [];
  const pieces = piecesLeft(state, player);
  switch (phase.type) {
    case 'setupVillage':
      return pieces.villages > 0
        ? state.board.vertices
            .filter((v) => canPlaceVillage(state, player, v.id, true))
            .map((v) => ({ type: 'placeVillage', player, vertex: v.id }))
        : [];
    case 'setupRoad':
      return state.board.edges
        .filter((e) => e.vertices.includes(phase.vertex) && state.roads[e.id] === undefined)
        .map((e) => ({ type: 'placeRoad', player, edge: e.id }));
    case 'bandit':
      return state.board.tiles
        .filter((t) => t.id !== state.bandit)
        .map((t) => ({ type: 'moveBandit', player, tile: t.id }));
    case 'steal':
      return phase.victims.flatMap((victim) => {
        const hand = getPlayer(state, victim).hand;
        const count = handSize(hand);
        if (count === 0) return [];
        const draw = nextRandom(state.rng);
        let index = Math.floor(draw.value * count);
        for (const resource of RESOURCES) {
          index -= hand[resource];
          if (index < 0)
            return [{ type: 'steal' as const, player, victim, resource, rng: draw.rng }];
        }
        return [];
      });
    case 'freeRoads':
      return legalRoadEdges(state, player).map((edge) => ({ type: 'placeRoad', player, edge }));
    case 'plenty':
      return RESOURCES.filter((r) => state.bank[r] > 0).map((resource) => ({
        type: 'takePlenty',
        player,
        resource,
      }));
    case 'monopoly':
      return RESOURCES.map((resource) => ({ type: 'monopoly', player, resource }));
    case 'roll':
    case 'action':
      break;
  }
  const result: Action[] = [];
  if (!state.devPlayed)
    for (const card of person.devCards) {
      if (card.boughtTurn >= state.turn || card.kind === 'victoryPoint') continue;
      if (phase.type === 'roll' && card.kind !== 'guard') continue;
      if (card.kind === 'roadBuilding' && legalRoadEdges(state, player).length === 0) continue;
      if (card.kind === 'yearOfPlenty' && handSize(state.bank) === 0) continue;
      result.push({ type: 'playDev', player, card: card.id });
    }
  if (phase.type === 'roll') {
    const first = nextRandom(state.rng);
    const second = nextRandom(first.rng);
    result.push({
      type: 'roll',
      player,
      dice: [1 + Math.floor(first.value * 6), 1 + Math.floor(second.value * 6)],
      rng: second.rng,
    });
    return result;
  }
  if (pieces.roads > 0 && canAfford(person.hand, COSTS.road))
    for (const edge of legalRoadEdges(state, player))
      result.push({ type: 'placeRoad', player, edge });
  if (pieces.villages > 0 && canAfford(person.hand, COSTS.village))
    for (const vertex of state.board.vertices)
      if (canPlaceVillage(state, player, vertex.id))
        result.push({ type: 'placeVillage', player, vertex: vertex.id });
  if (pieces.towns > 0 && canAfford(person.hand, COSTS.town))
    for (const [vertex, b] of Object.entries(state.buildings))
      if (b.owner === player && b.kind === 'village')
        result.push({ type: 'buildTown', player, vertex });
  if (state.deckIndex < state.deck.length && canAfford(person.hand, COSTS.dev))
    result.push({ type: 'buyDev', player });
  for (const give of RESOURCES) {
    const ratio = tradeRatio(state, player, give);
    if (person.hand[give] >= ratio)
      for (const receive of RESOURCES)
        if (receive !== give && state.bank[receive] > 0)
          result.push({ type: 'bankTrade', player, give, receive, ratio });
  }
  const draft = state.tradeDrafts[player] ?? emptyTrade();
  result.push(...tradeEdits(state, player, draft));
  for (const target of [null, ...state.players.filter((p) => p.id !== player).map((p) => p.id)])
    if (target !== draft.target) result.push({ type: 'targetTrade', player, target });
  if (validBasket(draft, person.hand)) result.push({ type: 'proposeTrade', player });
  result.push({ type: 'endTurn', player });
  return result;
}
/** The renderer and bots consume the exact same canonical action set. */
export function legalActions(state: GameState, player: number): Action[] {
  let byPlayer = cache.get(state);
  if (!byPlayer) {
    byPlayer = new Map();
    cache.set(state, byPlayer);
  }
  const cached = byPlayer.get(player);
  if (cached) return [...cached];
  const result = listActions(state, player);
  byPlayer.set(player, result);
  return [...result];
}
