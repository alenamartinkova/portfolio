import { describe, expect, it } from 'vitest';
import type { Action } from '../src/core/actions';
import { isAction, RuleViolation } from '../src/core/actions';
import { TERRAIN_RESOURCE } from '../src/core/board';
import type { DevKind } from '../src/core/devcards';
import { createDevDeck } from '../src/core/devcards';
import { canPlaceRoad, canPlaceVillage, getActor, legalActions } from '../src/core/legal';
import { reduce } from '../src/core/reducer';
import { publicVP, scoreBreakdown, updateAwards } from '../src/core/scoring';
import {
  createGame,
  getPlayer,
  handSize,
  piecesLeft,
  RESOURCES,
  resourceMap,
} from '../src/core/state';
import type { GameState, ResourceMap } from '../src/core/state';
import { tradeRatio } from '../src/core/trade';

const options = {
  seed: 42,
  layout: 'beginner' as const,
  players: Array.from({ length: 4 }, (_, i) => ({
    name: `Player ${i + 1}`,
    kind: 'human' as const,
  })),
};
function initial(): GameState {
  return createGame(options);
}
function actionPhase(): GameState {
  return { ...initial(), turn: 5, phase: { type: 'action' } };
}
function holdings(state: GameState, values: readonly Partial<ResourceMap>[]): GameState {
  const players = state.players.map((p, i) => ({ ...p, hand: { ...resourceMap(), ...values[i] } }));
  const bank = Object.fromEntries(
    RESOURCES.map((r) => [r, 19 - players.reduce((sum, p) => sum + p.hand[r], 0)]),
  ) as ResourceMap;
  if (RESOURCES.some((r) => bank[r] < 0)) throw new Error('Fixture exceeds card supply.');
  return { ...state, players, bank };
}
function findAction<T extends Action['type']>(
  state: GameState,
  type: T,
  player = getActor(state),
): Extract<Action, { type: T }> {
  const action = legalActions(state, player).find(
    (a): a is Extract<Action, { type: T }> => a.type === type,
  );
  if (!action)
    throw new Error(
      `Missing ${type} in ${state.phase.type}: ${JSON.stringify(legalActions(state, player))}`,
    );
  return action;
}
function doAction<T extends Action['type']>(
  state: GameState,
  type: T,
  player = getActor(state),
): GameState {
  return reduce(state, findAction(state, type, player));
}
function conservation(state: GameState): void {
  for (const r of RESOURCES)
    expect(state.bank[r] + state.players.reduce((sum, p) => sum + p.hand[r], 0)).toBe(19);
}
function addCard(state: GameState, kind: DevKind, boughtTurn = 1, id = 24): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === 0 ? { ...p, devCards: [...p.devCards, { id, kind, boughtTurn }] } : p,
    ),
  };
}
function withRoll(state: GameState, sum: number): GameState {
  for (let rng = 1; rng < 10000; rng++) {
    const candidate: GameState = { ...state, rng, phase: { type: 'roll' } };
    const roll = findAction(candidate, 'roll');
    if (roll.dice[0] + roll.dice[1] === sum) return candidate;
  }
  throw new Error('Unable to locate deterministic dice fixture.');
}
function firstVertex(state: GameState): string {
  const id = state.board.vertices[0]?.id;
  if (!id) throw new Error('Missing board vertex.');
  return id;
}
function ownedVillage(state: GameState): GameState {
  return { ...state, buildings: { [firstVertex(state)]: { owner: 0, kind: 'village' } } };
}

describe('setup and action validation', () => {
  it.each([2, 3, 4])(
    'places village/road pairs in forward order for %i players and grants only second-placement resources',
    (count) => {
      let state = createGame({ ...options, players: options.players.slice(0, count) });
      const order: number[] = [];
      for (let step = 0; step < count * 2; step++) {
        order.push(state.activePlayer);
        const action = findAction(state, 'placeVillage');
        const expected =
          state.board.vertices
            .find((v) => v.id === action.vertex)
            ?.hexes.flatMap((id) => {
              const tile = state.board.tiles.find((t) => t.id === id);
              return tile && TERRAIN_RESOURCE[tile.terrain] ? [TERRAIN_RESOURCE[tile.terrain]] : [];
            }).length ?? 0;
        const before = handSize(getPlayer(state, state.activePlayer).hand);
        state = reduce(state, action);
        expect(handSize(getPlayer(state, state.activePlayer).hand) - before).toBe(
          step >= count ? expected : 0,
        );
        expect(state.phase.type).toBe('setupRoad');
        state = doAction(state, 'placeRoad');
        conservation(state);
      }
      const round = Array.from({ length: count }, (_, index) => index);
      expect(order).toEqual([...round, ...round]);
      expect(state.phase).toEqual({ type: 'roll' });
      expect(state.activePlayer).toBe(0);
      expect(state.turn).toBe(1);
      expect(Object.keys(state.buildings)).toHaveLength(count * 2);
      expect(Object.keys(state.roads)).toHaveLength(count * 2);
    },
  );
  it('applies the distance rule from the very first village', () => {
    const start = initial();
    const vertex = start.board.vertices[0];
    if (!vertex) throw new Error('No vertex.');
    const state = reduce(start, { type: 'placeVillage', player: 0, vertex: vertex.id });
    for (const neighbor of vertex.neighbors)
      expect(canPlaceVillage(state, 1, neighbor, true)).toBe(false);
    expect(() =>
      reduce(
        { ...state, activePlayer: 1, phase: { type: 'setupVillage', step: 1 } },
        { type: 'placeVillage', player: 1, vertex: vertex.neighbors[0] ?? '' },
      ),
    ).toThrow(RuleViolation);
  });
  it('rejects unknown actions, wrong actors, forged RNG outcomes and malformed input', () => {
    expect(isAction({ type: 'roll', player: 0, dice: [0, 7], rng: 1 })).toBe(false);
    expect(isAction({ type: 'bankTrade', player: 0, give: 'gold', receive: 'ore', ratio: 2 })).toBe(
      false,
    );
    expect(isAction({ type: 'unknown', player: 0 })).toBe(false);
    expect(isAction({ type: 'roll', player: 0, dice: new Array<unknown>(2), rng: 1 })).toBe(false);
    expect(
      isAction({ type: 'respondTrade', player: 0, response: { toString: () => 'accept' } }),
    ).toBe(false);
    expect(() => reduce(initial(), null)).toThrow(RuleViolation);
    expect(() => reduce(initial(), undefined)).toThrow(RuleViolation);
    const state = withRoll(actionPhase(), 6);
    const roll = findAction(state, 'roll');
    expect(() => reduce(state, { ...roll, player: 1 })).toThrow(RuleViolation);
    expect(() => reduce(state, { ...roll, rng: roll.rng + 1 })).toThrow(RuleViolation);
    expect(() => reduce(state, { ...roll, dice: [1, 1] })).toThrow(RuleViolation);
  });
  it('does not mutate its input and accepts different object key order', () => {
    const state = initial();
    const snapshot = JSON.stringify(state);
    const action = findAction(state, 'placeVillage');
    const next = reduce(state, { vertex: action.vertex, player: action.player, type: action.type });
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(next).not.toBe(state);
  });
});

describe('building rules and physical pieces', () => {
  it('requires an own road outside setup and pays the full village cost', () => {
    let state = holdings(actionPhase(), [{ lumber: 2, brick: 2, wool: 1, grain: 1 }]);
    const edge = state.board.edges[0];
    if (!edge) throw new Error('No edge.');
    expect(canPlaceVillage(state, 0, edge.vertices[0])).toBe(false);
    state = { ...state, roads: { [edge.id]: 0 } };
    expect(canPlaceVillage(state, 0, edge.vertices[0])).toBe(true);
    state = reduce(state, { type: 'placeVillage', player: 0, vertex: edge.vertices[0] });
    expect(state.buildings[edge.vertices[0]]).toEqual({ owner: 0, kind: 'village' });
    expect(getPlayer(state, 0).hand).toEqual({ ...resourceMap(), lumber: 1, brick: 1 });
    conservation(state);
  });
  it('allows roads at own buildings and connected own roads, blocks opponent buildings', () => {
    let state = holdings(actionPhase(), [{ lumber: 3, brick: 3 }]);
    const edge = state.board.edges[0];
    if (!edge) throw new Error('No edge.');
    const tip = edge.vertices[1];
    const extension = state.board.edges.find((e) => e.id !== edge.id && e.vertices.includes(tip));
    if (!extension) throw new Error('No extension.');
    expect(canPlaceRoad(state, 0, edge.id)).toBe(false);
    expect(
      canPlaceRoad(
        { ...state, buildings: { [edge.vertices[0]]: { owner: 0, kind: 'village' } } },
        0,
        edge.id,
      ),
    ).toBe(true);
    state = { ...state, roads: { [edge.id]: 0 } };
    expect(canPlaceRoad(state, 0, extension.id)).toBe(true);
    const blocked: GameState = { ...state, buildings: { [tip]: { owner: 1, kind: 'village' } } };
    expect(canPlaceRoad(blocked, 0, extension.id)).toBe(false);
    expect(() => reduce(blocked, { type: 'placeRoad', player: 0, edge: extension.id })).toThrow(
      RuleViolation,
    );
  });
  it('upgrades only an own village, returns the village piece and pays grain/ore', () => {
    let state = ownedVillage(holdings(actionPhase(), [{ grain: 2, ore: 3 }]));
    const before = piecesLeft(state, 0);
    state = doAction(state, 'buildTown');
    expect(state.buildings[firstVertex(state)]?.kind).toBe('town');
    expect(piecesLeft(state, 0)).toEqual({
      ...before,
      villages: before.villages + 1,
      towns: before.towns - 1,
    });
    expect(handSize(getPlayer(state, 0).hand)).toBe(0);
    conservation(state);
    expect(legalActions(state, 0).some((a) => a.type === 'buildTown')).toBe(false);
  });
  it.each(['roads', 'villages', 'towns'] as const)('makes exhausted %s illegal', (piece) => {
    let state = holdings(actionPhase(), [{ lumber: 5, brick: 5, grain: 5, wool: 5, ore: 5 }]);
    if (piece === 'roads')
      state = {
        ...state,
        roads: Object.fromEntries(state.board.edges.slice(0, 15).map((e) => [e.id, 0])),
      };
    else
      state = {
        ...state,
        buildings: Object.fromEntries(
          state.board.vertices
            .slice(0, piece === 'villages' ? 5 : 4)
            .map((v) => [
              v.id,
              { owner: 0, kind: piece === 'villages' ? ('village' as const) : ('town' as const) },
            ]),
        ),
      };
    const type =
      piece === 'roads' ? 'placeRoad' : piece === 'villages' ? 'placeVillage' : 'buildTown';
    expect(legalActions(state, 0).some((a) => a.type === type)).toBe(false);
  });
});

describe('production, sevens and bandit', () => {
  function productionFixture(twoPlayers: boolean, bankCount: number): GameState {
    let state = holdings(actionPhase(), [{}, {}, { lumber: 19 - bankCount }]);
    const tile = state.board.tiles.find((t) => t.terrain === 'forest' && t.number === 6);
    const vertices = state.board.vertices.filter((v) => tile && v.hexes.includes(tile.id));
    const a = vertices[0]?.id;
    const b = vertices[2]?.id;
    if (!a || !b) throw new Error('No producing vertices.');
    state = {
      ...state,
      buildings: {
        [a]: { owner: 0, kind: 'town' },
        [b]: { owner: twoPlayers ? 1 : 0, kind: 'village' },
      },
    };
    return withRoll(state, 6);
  }
  it.each([
    { bank: 19, two: true, expected: [2, 1] },
    { bank: 2, two: true, expected: [0, 0] },
    { bank: 1, two: false, expected: [1, 0] },
  ])('handles bank $bank, multiple claimants $two', ({ bank, two, expected }) => {
    const next = doAction(productionFixture(two, bank), 'roll');
    expect([getPlayer(next, 0).hand.lumber, getPlayer(next, 1).hand.lumber]).toEqual(expected);
    conservation(next);
  });
  it('stops production on the bandit tile', () => {
    const fixture = productionFixture(true, 19);
    const tile = fixture.board.tiles.find((t) => t.terrain === 'forest' && t.number === 6);
    if (!tile) throw new Error('No forest.');
    const next = doAction({ ...fixture, bandit: tile.id }, 'roll');
    expect(getPlayer(next, 0).hand.lumber).toBe(0);
    expect(getPlayer(next, 1).hand.lumber).toBe(0);
  });
  it('discards floor(holding/2) only above seven, before moving the bandit', () => {
    let state = withRoll(
      holdings(actionPhase(), [{ wool: 7 }, { grain: 8 }, { brick: 9 }, { ore: 11 }]),
      7,
    );
    state = doAction(state, 'roll');
    expect(state.phase).toEqual({ type: 'discard', pending: { 0: 0, 1: 4, 2: 4, 3: 5 } });
    expect(legalActions(state, 0)).toEqual([]);
    for (let i = 0; i < 13; i++) {
      state = doAction(state, 'discard');
      conservation(state);
    }
    expect(state.phase.type).toBe('bandit');
    expect(state.players.map((p) => handSize(p.hand))).toEqual([7, 4, 5, 6]);
    expect(
      legalActions(state, 0).some((a) => a.type === 'moveBandit' && a.tile === state.bandit),
    ).toBe(false);
  });
  it('steals one canonical random card from an eligible opponent and preserves supply', () => {
    let state = holdings(actionPhase(), [{}, { grain: 3, wool: 2 }]);
    const tile = state.board.tiles.find((t) => t.id !== state.bandit);
    const vertex = state.board.vertices.find((v) => tile && v.hexes.includes(tile.id));
    if (!tile || !vertex) throw new Error('No bandit target.');
    state = {
      ...state,
      phase: { type: 'bandit', returnTo: 'action' },
      buildings: { [vertex.id]: { owner: 1, kind: 'town' } },
    };
    state = reduce(state, { type: 'moveBandit', player: 0, tile: tile.id });
    expect(state.phase.type).toBe('steal');
    const before = state.rng;
    state = doAction(state, 'steal');
    expect(handSize(getPlayer(state, 0).hand)).toBe(1);
    expect(handSize(getPlayer(state, 1).hand)).toBe(4);
    expect(state.rng).not.toBe(before);
    expect(state.phase.type).toBe('action');
    conservation(state);
  });
});

describe('development cards', () => {
  it('constructs the exact 25-card distribution', () => {
    const deck = createDevDeck();
    expect(deck).toHaveLength(25);
    expect(
      ['guard', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'].map(
        (kind) => deck.filter((c) => c === kind).length,
      ),
    ).toEqual([14, 5, 2, 2, 2]);
  });
  it('buys a seeded card, charges the cost, and cannot play it on its purchase turn', () => {
    let state = holdings(actionPhase(), [{ wool: 1, grain: 1, ore: 1 }]);
    state = doAction(state, 'buyDev');
    expect(getPlayer(state, 0).devCards[0]).toEqual({ id: 0, kind: state.deck[0], boughtTurn: 5 });
    expect(handSize(getPlayer(state, 0).hand)).toBe(0);
    expect(legalActions(state, 0).some((a) => a.type === 'playDev')).toBe(false);
    conservation(state);
  });
  it.each(['guard', 'roadBuilding', 'yearOfPlenty', 'monopoly'] as const)(
    'enforces purchase-turn and one-card limits for %s',
    (kind) => {
      let state = addCard(ownedVillage(actionPhase()), kind, 5);
      expect(legalActions(state, 0).some((a) => a.type === 'playDev')).toBe(false);
      state = { ...state, turn: 6 };
      expect(legalActions(state, 0).some((a) => a.type === 'playDev')).toBe(true);
      state = { ...state, devPlayed: true };
      expect(legalActions(state, 0).some((a) => a.type === 'playDev')).toBe(false);
    },
  );
  it('plays guards before rolling, increments the army, then returns to roll', () => {
    let state = addCard({ ...actionPhase(), phase: { type: 'roll' } }, 'guard');
    state = {
      ...state,
      players: state.players.map((p) => (p.id === 0 ? { ...p, guardsPlayed: 2 } : p)),
    };
    state = doAction(state, 'playDev');
    expect(state.largestArmyHolder).toBe(0);
    expect(state.phase).toEqual({ type: 'bandit', returnTo: 'roll' });
    state = doAction(state, 'moveBandit');
    expect(state.phase.type).toBe('roll');
    expect(state.devPlayed).toBe(true);
    expect(getPlayer(state, 0).guardsPlayed).toBe(3);
  });
  it('only allows guards before rolling and never plays victory cards', () => {
    for (const kind of ['roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'] as const) {
      const state = addCard({ ...ownedVillage(actionPhase()), phase: { type: 'roll' } }, kind);
      expect(legalActions(state, 0).some((a) => a.type === 'playDev')).toBe(false);
    }
  });
  it('builds two free connected roads without resources', () => {
    let state = addCard(ownedVillage(actionPhase()), 'roadBuilding');
    state = doAction(state, 'playDev');
    state = doAction(state, 'placeRoad');
    state = doAction(state, 'placeRoad');
    expect(Object.keys(state.roads)).toHaveLength(2);
    expect(state.phase.type).toBe('action');
    expect(handSize(getPlayer(state, 0).hand)).toBe(0);
    conservation(state);
  });
  it('finishes free roads after one placement when the last road piece is used', () => {
    let state = addCard(actionPhase(), 'roadBuilding');
    const edges = state.board.edges.slice(0, 14);
    state = { ...state, roads: Object.fromEntries(edges.map((e) => [e.id, 0])) };
    state = doAction(state, 'playDev');
    state = doAction(state, 'placeRoad');
    expect(piecesLeft(state, 0).roads).toBe(0);
    expect(state.phase.type).toBe('action');
  });
  it('takes two bank resources with year of plenty, permitting the same resource twice', () => {
    let state = doAction(addCard(actionPhase(), 'yearOfPlenty'), 'playDev');
    state = reduce(state, { type: 'takePlenty', player: 0, resource: 'ore' });
    state = reduce(state, { type: 'takePlenty', player: 0, resource: 'ore' });
    expect(getPlayer(state, 0).hand.ore).toBe(2);
    expect(state.phase.type).toBe('action');
    conservation(state);
  });
  it('takes just the last available bank card when only one remains', () => {
    let state = holdings(actionPhase(), [
      { lumber: 19, grain: 19, wool: 19 },
      { brick: 19, ore: 18 },
    ]);
    state = doAction(addCard(state, 'yearOfPlenty'), 'playDev');
    expect(state.phase).toEqual({ type: 'plenty', remaining: 1 });
    state = doAction(state, 'takePlenty');
    expect(state.bank.ore).toBe(0);
    expect(state.phase.type).toBe('action');
    conservation(state);
  });
  it('takes all of the chosen resource from every opponent with monopoly', () => {
    let state = holdings(addCard(actionPhase(), 'monopoly'), [
      { ore: 1 },
      { ore: 4 },
      { ore: 3 },
      { ore: 2 },
    ]);
    state = doAction(state, 'playDev');
    state = reduce(state, { type: 'monopoly', player: 0, resource: 'ore' });
    expect(state.players.map((p) => p.hand.ore)).toEqual([10, 0, 0, 0]);
    conservation(state);
  });
});

describe('bank, harbour and player trading', () => {
  it('uses the best owned harbour ratio', () => {
    const base = holdings(actionPhase(), [{ lumber: 8, grain: 8 }]);
    expect(tradeRatio(base, 0, 'lumber')).toBe(4);
    const generic = base.board.harbours.find((h) => h.resource === null);
    const lumber = base.board.harbours.find((h) => h.resource === 'lumber');
    if (!generic || !lumber) throw new Error('Missing harbour.');
    let state: GameState = {
      ...base,
      buildings: {
        [generic.vertices[0]]: { owner: 0, kind: 'village' },
        [lumber.vertices[1]]: { owner: 0, kind: 'town' },
      },
    };
    expect(tradeRatio(state, 0, 'lumber')).toBe(2);
    expect(tradeRatio(state, 0, 'grain')).toBe(3);
    state = reduce(state, {
      type: 'bankTrade',
      player: 0,
      give: 'lumber',
      receive: 'ore',
      ratio: 2,
    });
    expect(getPlayer(state, 0).hand.lumber).toBe(6);
    expect(getPlayer(state, 0).hand.ore).toBe(1);
    conservation(state);
    expect(() =>
      reduce(state, { type: 'bankTrade', player: 0, give: 'lumber', receive: 'ore', ratio: 4 }),
    ).toThrow(RuleViolation);
  });
  function offer(): GameState {
    let state = holdings(actionPhase(), [{ lumber: 3 }, { ore: 3 }, { ore: 2 }]);
    state = reduce(state, {
      type: 'editTrade',
      player: 0,
      side: 'give',
      resource: 'lumber',
      delta: 1,
    });
    state = reduce(state, {
      type: 'editTrade',
      player: 0,
      side: 'want',
      resource: 'ore',
      delta: 1,
    });
    return doAction(state, 'proposeTrade');
  }
  it('allows an addressed opponent to accept an affordable offer', () => {
    const state = reduce(offer(), { type: 'respondTrade', player: 1, response: 'accept' });
    expect(getPlayer(state, 0).hand).toEqual({ ...resourceMap(), lumber: 2, ore: 1 });
    expect(getPlayer(state, 1).hand).toEqual({ ...resourceMap(), lumber: 1, ore: 2 });
    expect(state.tradeOffer).toBeNull();
    conservation(state);
  });
  it('lets every respondent decline once and closes a fully declined offer', () => {
    let state = offer();
    for (const player of [1, 2, 3]) {
      state = reduce(state, { type: 'respondTrade', player, response: 'decline' });
      expect(legalActions(state, player).some((a) => a.type === 'respondTrade')).toBe(false);
    }
    expect(state.tradeOffer).toBeNull();
  });
  it('allows a modified counteroffer exactly once and current-player confirmation', () => {
    let state = offer();
    state = reduce(state, {
      type: 'editTrade',
      player: 1,
      side: 'want',
      resource: 'lumber',
      delta: 1,
    });
    state = reduce(state, { type: 'respondTrade', player: 1, response: 'counter' });
    expect(legalActions(state, 1)).toEqual([]);
    state = reduce(state, { type: 'acceptCounter', player: 0, opponent: 1 });
    expect(getPlayer(state, 0).hand).toEqual({ ...resourceMap(), lumber: 1, ore: 1 });
    expect(getPlayer(state, 1).hand).toEqual({ ...resourceMap(), lumber: 2, ore: 2 });
    expect(state.tradeOffer).toBeNull();
    conservation(state);
  });
  it('can address one opponent, excluding all others', () => {
    let state = holdings(actionPhase(), [{ lumber: 1 }, { ore: 1 }]);
    state = reduce(state, {
      type: 'editTrade',
      player: 0,
      side: 'give',
      resource: 'lumber',
      delta: 1,
    });
    state = reduce(state, {
      type: 'editTrade',
      player: 0,
      side: 'want',
      resource: 'ore',
      delta: 1,
    });
    state = reduce(state, { type: 'targetTrade', player: 0, target: 1 });
    state = doAction(state, 'proposeTrade');
    expect(legalActions(state, 2)).toEqual([]);
    expect(legalActions(state, 1).some((a) => a.type === 'respondTrade')).toBe(true);
  });
});

describe('scoring and victory', () => {
  it("removes tie priority when the former holder's route is interrupted", () => {
    let state = actionPhase();
    const edges = [
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `a${i}`,
        vertices: [`A${i}`, `A${i + 1}`] as const,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `b${i}`,
        vertices: [`B${i}`, `B${i + 1}`] as const,
      })),
    ];
    state = {
      ...state,
      board: { ...state.board, edges },
      roads: Object.fromEntries(edges.map((e) => [e.id, e.id.startsWith('a') ? 0 : 1])),
      buildings: { A1: { owner: 2, kind: 'village' } },
      routeLengths: [6, 5, 0, 0],
      longestRouteHolder: 0,
    };
    const interrupted = updateAwards(state, true);
    expect(interrupted.routeLengths).toEqual([5, 5, 0, 0]);
    expect(interrupted.longestRouteHolder).toBeNull();
    expect(updateAwards({ ...state, routeLengths: [5, 5, 0, 0] }, true).longestRouteHolder).toBe(0);
  });
  it('retains the guard banner on ties and transfers only to a larger army', () => {
    let state = actionPhase();
    state = {
      ...state,
      largestArmyHolder: 1,
      players: state.players.map((p) => ({ ...p, guardsPlayed: p.id < 2 ? 3 : 0 })),
    };
    state = doAction(state, 'endTurn');
    expect(state.largestArmyHolder).toBe(1);
    state = { ...state, activePlayer: 0, phase: { type: 'action' } };
    state = doAction(addCard(state, 'guard'), 'playDev');
    expect(state.largestArmyHolder).toBe(0);
  });
  it('counts hidden victory cards but reveals them only when their owner wins on their turn', () => {
    let state = actionPhase();
    const vertices = state.board.vertices.slice(0, 4);
    state = {
      ...state,
      activePlayer: 1,
      buildings: Object.fromEntries(
        vertices.map((v) => [v.id, { owner: 0, kind: 'town' as const }]),
      ),
    };
    state = addCard(addCard(state, 'victoryPoint', 1, 100), 'victoryPoint', 1, 101);
    expect(scoreBreakdown(state, 0)).toEqual({
      buildings: 8,
      largestArmy: 0,
      longestRoute: 0,
      victoryCards: 2,
      total: 10,
    });
    expect(publicVP(state, 0)).toBe(8);
    state = doAction(state, 'endTurn');
    expect(state.phase.type).toBe('roll');
    state = { ...state, activePlayer: 3, phase: { type: 'action' } };
    state = doAction(state, 'endTurn');
    expect(state.phase).toEqual({ type: 'gameOver', winner: 0 });
    expect(getPlayer(state, 0).revealedVP).toBe(true);
    expect(publicVP(state, 0)).toBe(10);
    expect(legalActions(state, 0)).toEqual([]);
  });
});
