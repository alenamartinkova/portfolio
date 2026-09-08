import { actionKey, isAction, RuleViolation } from './actions';
import type { Action } from './actions';
import { TERRAIN_RESOURCE } from './board';
import type { Resource } from './board';
import { legalActions, legalRoadEdges } from './legal';
import { appendLog } from './log';
import { scoreBreakdown, updateAwards } from './scoring';
import { COSTS, emptyTrade, getPlayer, handSize, RESOURCES, resourceMap } from './state';
import type { GameState, Player, ResourceMap } from './state';

function changePlayer(state: GameState, id: number, change: (player: Player) => Player): GameState {
  return { ...state, players: state.players.map((p) => (p.id === id ? change(p) : p)) };
}
function bankToPlayer(
  state: GameState,
  player: number,
  resource: Resource,
  amount: number,
): GameState {
  return changePlayer(
    { ...state, bank: { ...state.bank, [resource]: state.bank[resource] - amount } },
    player,
    (p) => ({ ...p, hand: { ...p.hand, [resource]: p.hand[resource] + amount } }),
  );
}
function pay(state: GameState, player: number, cost: ResourceMap): GameState {
  let next = state;
  for (const resource of RESOURCES)
    if (cost[resource] !== 0) next = bankToPlayer(next, player, resource, -cost[resource]);
  return next;
}
function playerToPlayer(
  state: GameState,
  from: number,
  to: number,
  resource: Resource,
  count: number,
): GameState {
  let next = changePlayer(state, from, (p) => ({
    ...p,
    hand: { ...p.hand, [resource]: p.hand[resource] - count },
  }));
  next = changePlayer(next, to, (p) => ({
    ...p,
    hand: { ...p.hand, [resource]: p.hand[resource] + count },
  }));
  return next;
}
function exchange(
  state: GameState,
  from: number,
  to: number,
  give: ResourceMap,
  want: ResourceMap,
): GameState {
  let next = state;
  for (const resource of RESOURCES) {
    if (give[resource]) next = playerToPlayer(next, from, to, resource, give[resource]);
    if (want[resource]) next = playerToPlayer(next, to, from, resource, want[resource]);
  }
  return {
    ...next,
    tradeOffer: null,
    tradeDrafts: { ...next.tradeDrafts, [from]: emptyTrade(), [to]: emptyTrade() },
  };
}
function production(state: GameState, total: number): GameState {
  const claims: Record<number, ResourceMap> = Object.fromEntries(
    state.players.map((p) => [p.id, resourceMap()]),
  );
  for (const [id, building] of Object.entries(state.buildings)) {
    const vertex = state.board.vertices.find((v) => v.id === id);
    if (!vertex) continue;
    for (const hex of vertex.hexes) {
      const tile = state.board.tiles.find((t) => t.id === hex);
      if (!tile || tile.id === state.bandit || tile.number !== total) continue;
      const resource = TERRAIN_RESOURCE[tile.terrain];
      if (!resource) continue;
      const current = claims[building.owner] ?? resourceMap();
      claims[building.owner] = {
        ...current,
        [resource]: current[resource] + (building.kind === 'town' ? 2 : 1),
      };
    }
  }
  let next = state;
  for (const resource of RESOURCES) {
    const owed = state.players.filter((p) => (claims[p.id]?.[resource] ?? 0) > 0);
    const demand = owed.reduce((sum, p) => sum + (claims[p.id]?.[resource] ?? 0), 0);
    if (demand > state.bank[resource] && owed.length > 1) continue;
    for (const person of owed)
      next = bankToPlayer(
        next,
        person.id,
        resource,
        Math.min(next.bank[resource], claims[person.id]?.[resource] ?? 0),
      );
  }
  return next;
}
function closeFinishedOffer(state: GameState): GameState {
  const offer = state.tradeOffer;
  if (
    offer &&
    Object.values(offer.responses).every((response) => response !== 'pending') &&
    Object.keys(offer.counters).length === 0
  )
    return { ...state, tradeOffer: null };
  return state;
}
function apply(state: GameState, action: Action): GameState {
  const player = action.player;
  switch (action.type) {
    case 'placeVillage': {
      let next: GameState = {
        ...state,
        buildings: { ...state.buildings, [action.vertex]: { owner: player, kind: 'village' } },
      };
      if (state.phase.type === 'setupVillage') {
        if (state.phase.step >= state.players.length) {
          for (const hex of state.board.vertices.find((v) => v.id === action.vertex)?.hexes ?? []) {
            const tile = state.board.tiles.find((t) => t.id === hex);
            const resource = tile ? TERRAIN_RESOURCE[tile.terrain] : null;
            if (resource && next.bank[resource] > 0) next = bankToPlayer(next, player, resource, 1);
          }
        }
        return {
          ...next,
          phase: { type: 'setupRoad', step: state.phase.step, vertex: action.vertex },
        };
      }
      return pay(next, player, COSTS.village);
    }
    case 'placeRoad': {
      let next: GameState = { ...state, roads: { ...state.roads, [action.edge]: player } };
      if (state.phase.type === 'setupRoad') {
        const step = state.phase.step + 1;
        const count = state.players.length;
        if (step === count * 2)
          return { ...next, phase: { type: 'roll' }, activePlayer: 0, turn: 1 };
        return {
          ...next,
          phase: { type: 'setupVillage', step },
          activePlayer: step < count ? step : count * 2 - 1 - step,
        };
      }
      if (state.phase.type === 'freeRoads') {
        const remaining = state.phase.remaining - 1;
        next = {
          ...next,
          phase:
            remaining > 0 && legalRoadEdges(next, player).length > 0
              ? { type: 'freeRoads', remaining }
              : { type: 'action' },
        };
        return next;
      }
      return pay(next, player, COSTS.road);
    }
    case 'buildTown':
      return pay(
        {
          ...state,
          buildings: { ...state.buildings, [action.vertex]: { owner: player, kind: 'town' } },
        },
        player,
        COSTS.town,
      );
    case 'roll': {
      const next: GameState = {
        ...state,
        rng: action.rng,
        dice: action.dice,
        phase: { type: 'action' },
      };
      const total = action.dice[0] + action.dice[1];
      if (total !== 7) return production(next, total);
      const pending = Object.fromEntries(
        state.players.map((p) => [
          p.id,
          handSize(p.hand) > 7 ? Math.floor(handSize(p.hand) / 2) : 0,
        ]),
      );
      return {
        ...next,
        phase: Object.values(pending).some((n) => n > 0)
          ? { type: 'discard', pending }
          : { type: 'bandit', returnTo: 'action' },
      };
    }
    case 'discard': {
      if (state.phase.type !== 'discard') throw new RuleViolation('No resources need discarding.');
      const pending = { ...state.phase.pending, [player]: (state.phase.pending[player] ?? 0) - 1 };
      const next = bankToPlayer(state, player, action.resource, -1);
      return {
        ...next,
        phase: Object.values(pending).some((n) => n > 0)
          ? { type: 'discard', pending }
          : { type: 'bandit', returnTo: 'action' },
      };
    }
    case 'moveBandit': {
      if (state.phase.type !== 'bandit') throw new RuleViolation('The bandit cannot move now.');
      const owners = new Set(
        state.board.vertices
          .filter((v) => v.hexes.includes(action.tile))
          .flatMap((v) => {
            const building = state.buildings[v.id];
            return building &&
              building.owner !== player &&
              handSize(getPlayer(state, building.owner).hand) > 0
              ? [building.owner]
              : [];
          }),
      );
      const victims = [...owners].sort((a, b) => a - b);
      return {
        ...state,
        bandit: action.tile,
        phase:
          victims.length > 0
            ? { type: 'steal', tile: action.tile, victims, returnTo: state.phase.returnTo }
            : { type: state.phase.returnTo },
      };
    }
    case 'steal': {
      if (state.phase.type !== 'steal')
        throw new RuleViolation('Choose a bandit destination first.');
      return {
        ...playerToPlayer(state, action.victim, player, action.resource, 1),
        rng: action.rng,
        phase: { type: state.phase.returnTo },
      };
    }
    case 'bankTrade':
      return bankToPlayer(
        bankToPlayer(state, player, action.give, -action.ratio),
        player,
        action.receive,
        1,
      );
    case 'buyDev': {
      const kind = state.deck[state.deckIndex];
      if (!kind) throw new RuleViolation('The development deck is empty.');
      const next = changePlayer(state, player, (p) => ({
        ...p,
        devCards: [...p.devCards, { id: state.deckIndex, kind, boughtTurn: state.turn }],
      }));
      return pay({ ...next, deckIndex: state.deckIndex + 1 }, player, COSTS.dev);
    }
    case 'playDev': {
      const card = getPlayer(state, player).devCards.find((c) => c.id === action.card);
      if (!card) throw new RuleViolation('That card is not in your hand.');
      let next = changePlayer(state, player, (p) => ({
        ...p,
        devCards: p.devCards.filter((c) => c.id !== card.id),
      }));
      next = { ...next, devPlayed: true };
      if (card.kind === 'guard')
        return changePlayer(
          {
            ...next,
            phase: { type: 'bandit', returnTo: state.phase.type === 'roll' ? 'roll' : 'action' },
          },
          player,
          (p) => ({ ...p, guardsPlayed: p.guardsPlayed + 1 }),
        );
      if (card.kind === 'roadBuilding')
        return { ...next, phase: { type: 'freeRoads', remaining: 2 } };
      if (card.kind === 'yearOfPlenty')
        return { ...next, phase: { type: 'plenty', remaining: Math.min(2, handSize(state.bank)) } };
      if (card.kind === 'monopoly') return { ...next, phase: { type: 'monopoly' } };
      throw new RuleViolation('Victory cards reveal automatically when you win.');
    }
    case 'takePlenty': {
      if (state.phase.type !== 'plenty')
        throw new RuleViolation('Play a year of plenty card first.');
      const next = bankToPlayer(state, player, action.resource, 1);
      const remaining = state.phase.remaining - 1;
      return {
        ...next,
        phase:
          remaining > 0 && handSize(next.bank) > 0
            ? { type: 'plenty', remaining }
            : { type: 'action' },
      };
    }
    case 'monopoly': {
      let next = state;
      for (const other of state.players)
        if (other.id !== player)
          next = playerToPlayer(
            next,
            other.id,
            player,
            action.resource,
            other.hand[action.resource],
          );
      return { ...next, phase: { type: 'action' } };
    }
    case 'editTrade': {
      const draft = state.tradeDrafts[player] ?? emptyTrade();
      return {
        ...state,
        tradeDrafts: {
          ...state.tradeDrafts,
          [player]: {
            ...draft,
            [action.side]: {
              ...draft[action.side],
              [action.resource]: draft[action.side][action.resource] + action.delta,
            },
          },
        },
      };
    }
    case 'targetTrade':
      return {
        ...state,
        tradeDrafts: {
          ...state.tradeDrafts,
          [player]: { ...(state.tradeDrafts[player] ?? emptyTrade()), target: action.target },
        },
      };
    case 'proposeTrade': {
      const draft = state.tradeDrafts[player] ?? emptyTrade();
      const opponents = state.players.filter(
        (p) => p.id !== player && (draft.target === null || draft.target === p.id),
      );
      return {
        ...state,
        tradeOffer: {
          proposer: player,
          give: draft.give,
          want: draft.want,
          responses: Object.fromEntries(opponents.map((p) => [p.id, 'pending' as const])),
          counters: {},
        },
        tradeDrafts: {
          ...state.tradeDrafts,
          ...Object.fromEntries(
            opponents.map((p) => [p.id, { give: draft.want, want: draft.give, target: player }]),
          ),
        },
      };
    }
    case 'respondTrade': {
      const offer = state.tradeOffer;
      if (!offer) throw new RuleViolation('There is no open trade offer.');
      if (action.response === 'accept')
        return exchange(state, offer.proposer, player, offer.give, offer.want);
      if (action.response === 'counter')
        return {
          ...state,
          tradeOffer: {
            ...offer,
            responses: { ...offer.responses, [player]: 'countered' },
            counters: { ...offer.counters, [player]: state.tradeDrafts[player] ?? emptyTrade() },
          },
        };
      return closeFinishedOffer({
        ...state,
        tradeOffer: { ...offer, responses: { ...offer.responses, [player]: 'declined' } },
      });
    }
    case 'acceptCounter': {
      const counter = state.tradeOffer?.counters[action.opponent];
      if (!counter) throw new RuleViolation('That counteroffer is no longer open.');
      return exchange(state, action.opponent, player, counter.give, counter.want);
    }
    case 'declineCounter': {
      const offer = state.tradeOffer;
      if (!offer) throw new RuleViolation('There is no open trade offer.');
      const counters = { ...offer.counters };
      delete counters[action.opponent];
      return closeFinishedOffer({ ...state, tradeOffer: { ...offer, counters } });
    }
    case 'cancelTrade':
      return { ...state, tradeOffer: null };
    case 'endTurn':
      return {
        ...state,
        activePlayer: (state.activePlayer + 1) % state.players.length,
        turn: state.turn + 1,
        phase: { type: 'roll' },
        dice: null,
        devPlayed: false,
        tradeDrafts: Object.fromEntries(state.players.map((p) => [p.id, emptyTrade()])),
      };
  }
}
function checkVictory(state: GameState): GameState {
  if (
    state.phase.type === 'setupVillage' ||
    state.phase.type === 'setupRoad' ||
    state.phase.type === 'gameOver'
  )
    return state;
  if (scoreBreakdown(state, state.activePlayer).total < 10) return state;
  return changePlayer(
    { ...state, phase: { type: 'gameOver', winner: state.activePlayer }, tradeOffer: null },
    state.activePlayer,
    (p) => ({ ...p, revealedVP: true }),
  );
}
export function reduce(state: GameState, action: unknown): GameState {
  if (!isAction(action))
    throw new RuleViolation('That action is malformed. Choose one of the available actions.');
  if (!legalActions(state, action.player).some((legal) => actionKey(legal) === actionKey(action))) {
    const message =
      action.type === 'placeVillage'
        ? 'That vertex is too close to an existing village, disconnected, or unaffordable. Choose a marked vertex.'
        : action.type === 'placeRoad'
          ? 'That road is occupied, disconnected, blocked by an opponent, or unaffordable. Choose a marked edge.'
          : 'That action is unavailable in this phase. Choose one of the available actions.';
    throw new RuleViolation(message);
  }
  // Victory belongs to the current player, including a title acquired on an opponent's turn.
  const beforeEnd = action.type === 'endTurn' ? checkVictory(state) : state;
  if (beforeEnd.phase.type === 'gameOver') return appendLog(state, beforeEnd, action);
  let next = apply(state, action);
  next = updateAwards(next, ['placeVillage', 'placeRoad', 'buildTown'].includes(action.type));
  next = checkVictory(next);
  return appendLog(state, next, action);
}
