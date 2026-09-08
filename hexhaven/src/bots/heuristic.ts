import type { Action } from '../core/actions';
import { legalActions } from '../core/legal';
import { publicVP } from '../core/scoring';
import {
  COSTS,
  emptyTrade,
  getPlayer,
  RESOURCES,
  resourceMap,
  type GameState,
  type ResourceMap,
} from '../core/state';
import {
  evaluatePosition,
  feedsWinningBuild,
  pipWeight,
  resourceDeficit,
  tradeImprovement,
  type Evaluation,
} from './evaluate';

const firstBest = (actions: readonly Action[], score: (action: Action) => number): Action => {
  const first = actions[0];
  if (first === undefined) throw new Error('A bot cannot move without a legal action.');
  let best = first;
  let bestScore = -Infinity;
  for (const action of actions) {
    const value = score(action);
    if (value > bestScore) {
      best = action;
      bestScore = value;
    }
  }
  return best;
};

function chooseTradeResponse(
  state: GameState,
  player: number,
  actions: readonly Action[],
  position: Evaluation,
): Action {
  const offer = state.tradeOffer;
  if (offer === null) throw new Error('Trade evaluation requires an open offer.');
  const accept = actions.find(
    (action) => action.type === 'respondTrade' && action.response === 'accept',
  );
  if (
    accept !== undefined &&
    tradeImprovement(state, player, offer.want, offer.give, position.target) > 0 &&
    !feedsWinningBuild(state, offer.proposer, offer.want, offer.give)
  )
    return accept;
  for (const action of actions) {
    if (action.type !== 'acceptCounter') continue;
    const counter = offer.counters[action.opponent];
    if (
      counter !== undefined &&
      tradeImprovement(state, player, counter.want, counter.give, position.target) > 0 &&
      !feedsWinningBuild(state, action.opponent, counter.want, counter.give)
    )
      return action;
  }
  if (player !== offer.proposer && getPlayer(state, player).difficulty !== 'easy') {
    const hand = getPlayer(state, player).hand;
    const cost = COSTS[position.target];
    const want = RESOURCES.find(
      (resource) =>
        hand[resource] < cost[resource] && getPlayer(state, offer.proposer).hand[resource] > 0,
    );
    const give = [...RESOURCES]
      .sort((first, second) => hand[second] - cost[second] - (hand[first] - cost[first]))
      .find((resource) => resource !== want && hand[resource] > cost[resource]);
    if (give !== undefined && want !== undefined) {
      const desiredGive = { ...resourceMap(), [give]: 1 };
      const desiredWant = { ...resourceMap(), [want]: 1 };
      if (!feedsWinningBuild(state, offer.proposer, desiredGive, desiredWant)) {
        const draft = state.tradeDrafts[player] ?? emptyTrade();
        const desired = { give: desiredGive, want: desiredWant };
        for (const side of ['give', 'want'] as const)
          for (const resource of RESOURCES) {
            if (draft[side][resource] > desired[side][resource]) {
              const edit = actions.find(
                (action) =>
                  action.type === 'editTrade' &&
                  action.side === side &&
                  action.resource === resource &&
                  action.delta === -1,
              );
              if (edit !== undefined) return edit;
            }
          }
        for (const side of ['give', 'want'] as const)
          for (const resource of RESOURCES) {
            if (draft[side][resource] < desired[side][resource]) {
              const edit = actions.find(
                (action) =>
                  action.type === 'editTrade' &&
                  action.side === side &&
                  action.resource === resource &&
                  action.delta === 1,
              );
              if (edit !== undefined) return edit;
            }
          }
        const counter = actions.find(
          (action) => action.type === 'respondTrade' && action.response === 'counter',
        );
        if (counter !== undefined) return counter;
      }
    }
  }
  return firstBest(actions, (action) =>
    action.type === 'respondTrade' && action.response === 'decline'
      ? 10
      : action.type === 'declineCounter'
        ? 9
        : action.type === 'cancelTrade'
          ? 8
          : -100,
  );
}

function banditScore(state: GameState, player: number, tileId: string): number {
  const tile = state.board.tiles.find((candidate) => candidate.id === tileId);
  if (tile === undefined) return -Infinity;
  let score = 0;
  let own = false;
  let touchesLeader = false;
  const leader = Math.max(
    ...state.players
      .filter((candidate) => candidate.id !== player)
      .map((candidate) => publicVP(state, candidate.id)),
  );
  for (const vertex of state.board.vertices) {
    if (!vertex.hexes.includes(tileId)) continue;
    const building = state.buildings[vertex.id];
    if (building === undefined) continue;
    if (building.owner === player) {
      own = true;
      continue;
    }
    const vp = publicVP(state, building.owner);
    if (vp === leader) touchesLeader = true;
    score += pipWeight(tile.number) * (building.kind === 'town' ? 2 : 1) + vp;
  }
  return (
    score + (touchesLeader ? 10_000 + pipWeight(tile.number) * 100 : 0) - (own ? 1_000_000 : 0)
  );
}

function actionScore(
  state: GameState,
  player: number,
  action: Action,
  position: Evaluation,
): number {
  const person = getPlayer(state, player);
  const cost = COSTS[position.target];
  switch (action.type) {
    case 'placeVillage':
      return 900 + (position.vertexScores.get(action.vertex) ?? 0);
    case 'buildTown':
      return 1000 + (position.vertexScores.get(action.vertex) ?? 0);
    case 'placeRoad': {
      const plan = position.expansions.find((candidate) => candidate.firstEdge === action.edge);
      if (plan !== undefined) return 600 + plan.score / (1 + plan.distance);
      if (state.phase.type === 'setupRoad' || state.phase.type === 'freeRoads') {
        const edge = state.board.edges.find((candidate) => candidate.id === action.edge);
        return Math.max(
          ...(edge?.vertices.map((vertex) => position.vertexScores.get(vertex) ?? 0) ?? [0]),
        );
      }
      return -10;
    }
    case 'roll':
      return 100;
    case 'discard':
      return (
        (person.hand[action.resource] - cost[action.resource]) * 10 +
        position.production[action.resource]
      );
    case 'moveBandit':
      return banditScore(state, player, action.tile);
    case 'steal':
      return (
        publicVP(state, action.victim) * 10 +
        Math.max(0, cost[action.resource] - person.hand[action.resource])
      );
    case 'takePlenty':
      return (
        Math.max(0, cost[action.resource] - person.hand[action.resource]) * 100 -
        person.hand[action.resource] -
        position.production[action.resource] / 20
      );
    case 'monopoly':
      return state.players.reduce(
        (sum, opponent) => sum + (opponent.id === player ? 0 : opponent.hand[action.resource]),
        0,
      );
    case 'bankTrade': {
      if (
        person.hand[action.receive] >= cost[action.receive] ||
        person.hand[action.give] - action.ratio < cost[action.give]
      )
        return -10;
      return 700 - action.ratio * 5 + person.hand[action.give] - cost[action.give];
    }
    case 'buyDev': {
      const townNeed = resourceDeficit(person.hand, COSTS.town);
      return position.target === 'town' && townNeed <= 2 ? -1 : 400;
    }
    case 'playDev': {
      const card = person.devCards.find((candidate) => candidate.id === action.card);
      switch (card?.kind) {
        case 'guard':
          return 1100;
        case 'roadBuilding':
          return position.expansions.some((plan) => plan.distance > 0) ? 1050 : 80;
        case 'yearOfPlenty':
          return resourceDeficit(person.hand, cost) > 0 ? 1040 : 50;
        case 'monopoly':
          return Math.max(
            ...RESOURCES.map((resource) =>
              state.players.reduce(
                (sum, opponent) => sum + (opponent.id === player ? 0 : opponent.hand[resource]),
                0,
              ),
            ),
          ) >= 2
            ? 1030
            : -1;
        default:
          return -100;
      }
    }
    case 'endTurn':
      return 0;
    default:
      return -100;
  }
}

/** Every policy choice is an object supplied by the engine's canonical legal set. */
export function chooseAction(state: GameState, player: number): Action {
  const actions = legalActions(state, player);
  if (actions.length === 0)
    throw new Error(`Player ${player} has no legal action in ${state.phase.type}.`);
  const only = actions[0];
  if (actions.length === 1 && only !== undefined) return only;
  const position = evaluatePosition(state, player);
  if (state.tradeOffer !== null) return chooseTradeResponse(state, player, actions, position);
  return firstBest(actions, (action) => actionScore(state, player, action, position));
}

export default chooseAction;

export function desiredResources(state: GameState, player: number): ResourceMap {
  const position = evaluatePosition(state, player);
  const hand = getPlayer(state, player).hand;
  return Object.fromEntries(
    RESOURCES.map((resource) => [
      resource,
      Math.max(0, COSTS[position.target][resource] - hand[resource]),
    ]),
  ) as ResourceMap;
}
