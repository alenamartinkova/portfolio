import { describe, expect, it } from 'vitest';
import { chooseAction } from '../src/bots/heuristic';
import { evaluatePosition, pipWeight, resourceDeficit } from '../src/bots/evaluate';
import { getActor, legalActions } from '../src/core/legal';
import { reduce } from '../src/core/reducer';
import {
  createGame,
  getPlayer,
  RESOURCES,
  resourceMap,
  type Difficulty,
  type GameState,
  type ResourceMap,
} from '../src/core/state';
import { assertConservation, simulateGame } from '../src/sim/run';

function setup(difficulty: Difficulty = 'normal', seed = 71): GameState {
  let state = createGame({
    seed,
    layout: 'random',
    players: ['Alder', 'Bay', 'Fern', 'Sage'].map((name) => ({ name, kind: 'bot', difficulty })),
  });
  while (state.phase.type === 'setupVillage' || state.phase.type === 'setupRoad')
    state = reduce(state, chooseAction(state, getActor(state)));
  return state;
}

function giveHands(state: GameState, hands: Readonly<Record<number, ResourceMap>>): GameState {
  const players = state.players.map((player) => ({
    ...player,
    hand: hands[player.id] ?? resourceMap(),
  }));
  const bank = Object.fromEntries(
    RESOURCES.map((resource) => [
      resource,
      19 - players.reduce((sum, player) => sum + player.hand[resource], 0),
    ]),
  ) as ResourceMap;
  return { ...state, players, bank, phase: { type: 'action' }, turn: 10, activePlayer: 0 };
}

describe('one evaluator and canonical bot actions', () => {
  it.each(['easy', 'normal', 'hard'] as const)(
    '%s decisions come directly from legalActions through setup and play',
    (difficulty) => {
      let state = createGame({
        seed: 31,
        layout: 'random',
        players: ['A', 'B', 'C', 'D'].map((name) => ({ name, kind: 'bot', difficulty })),
      });
      for (let index = 0; index < 100 && state.phase.type !== 'gameOver'; index += 1) {
        const player = getActor(state);
        const canonical = legalActions(state, player);
        const action = chooseAction(state, player);
        expect(canonical).toContain(action);
        expect(chooseAction(state, player)).toBe(action);
        state = reduce(state, action);
        assertConservation(state);
      }
      expect(Object.values(state.buildings).length).toBeGreaterThanOrEqual(8);
    },
  );

  it('scores setup using production probability, diversity, and scarcity', () => {
    const state = createGame({
      seed: 4,
      layout: 'beginner',
      players: [
        { name: 'A', kind: 'bot' },
        { name: 'B', kind: 'bot' },
      ],
    });
    const position = evaluatePosition(state, 0);
    const action = chooseAction(state, 0);
    expect(action.type).toBe('placeVillage');
    if (action.type !== 'placeVillage') throw new Error('Expected a village.');
    const legalScores = legalActions(state, 0).flatMap((candidate) =>
      candidate.type === 'placeVillage' ? [position.vertexScores.get(candidate.vertex) ?? 0] : [],
    );
    expect(position.vertexScores.get(action.vertex)).toBe(Math.max(...legalScores));
    expect(pipWeight(6)).toBe(5);
    expect(pipWeight(8)).toBe(5);
    expect(pipWeight(12)).toBe(1);
    expect(pipWeight(null)).toBe(0);
  });

  it('upgrades a town before buying a development card or extending roads', () => {
    const state = giveHands(setup(), { 0: { lumber: 2, brick: 2, wool: 2, grain: 4, ore: 5 } });
    expect(legalActions(state, 0).some((action) => action.type === 'buyDev')).toBe(true);
    expect(legalActions(state, 0).some((action) => action.type === 'placeRoad')).toBe(true);
    expect(chooseAction(state, 0).type).toBe('buildTown');
  });

  it('uses an available bank or harbour ratio to complete its target', () => {
    const state = giveHands(setup(), { 0: { lumber: 4, brick: 0, wool: 0, grain: 2, ore: 2 } });
    const action = chooseAction(state, 0);
    expect(action.type).toBe('bankTrade');
    if (action.type !== 'bankTrade') throw new Error('Expected a bank trade.');
    expect(action.give).toBe('lumber');
    expect(action.receive).toBe('ore');
    const after = reduce(state, action);
    expect(chooseAction(after, 0).type).toBe('buildTown');
  });

  it('discards surplus resources before the cards needed for a town', () => {
    const supplied = giveHands(setup(), { 0: { lumber: 7, brick: 1, wool: 1, grain: 2, ore: 3 } });
    const state: GameState = { ...supplied, phase: { type: 'discard', pending: { 0: 7 } } };
    expect(chooseAction(state, 0)).toMatchObject({ type: 'discard', resource: 'lumber' });
  });

  it('takes the resource needed to complete the cheapest pending build', () => {
    const supplied = giveHands(setup(), { 0: { ...resourceMap(), grain: 2, ore: 2 } });
    const state: GameState = { ...supplied, phase: { type: 'plenty', remaining: 2 } };
    const action = chooseAction(state, 0);
    expect(action).toMatchObject({ type: 'takePlenty', resource: 'ore' });
    expect(
      resourceDeficit(getPlayer(reduce(state, action), 0).hand, {
        ...resourceMap(),
        grain: 2,
        ore: 3,
      }),
    ).toBe(0);
  });

  it('names the resource with the most opponent holdings for monopoly', () => {
    const supplied = giveHands(setup(), {
      0: { ...resourceMap(), ore: 10 },
      1: { ...resourceMap(), wool: 4 },
      2: { ...resourceMap(), wool: 3, grain: 5 },
    });
    const state: GameState = { ...supplied, phase: { type: 'monopoly' } };
    expect(chooseAction(state, 0)).toMatchObject({ type: 'monopoly', resource: 'wool' });
  });

  it('blocks the highest-pip available leader tile without blocking itself', () => {
    const initial = setup();
    const state: GameState = {
      ...initial,
      largestArmyHolder: 1,
      phase: { type: 'bandit', returnTo: 'action' },
    };
    const eligible = state.board.tiles.filter(
      (tile) =>
        tile.id !== state.bandit &&
        state.board.vertices.some(
          (vertex) => vertex.hexes.includes(tile.id) && state.buildings[vertex.id]?.owner === 1,
        ) &&
        !state.board.vertices.some(
          (vertex) => vertex.hexes.includes(tile.id) && state.buildings[vertex.id]?.owner === 0,
        ),
    );
    expect(eligible.length).toBeGreaterThan(0);
    const action = chooseAction(state, 0);
    expect(action.type).toBe('moveBandit');
    if (action.type !== 'moveBandit') throw new Error('Expected a bandit move.');
    expect(eligible.map((tile) => tile.id)).toContain(action.tile);
    expect(
      pipWeight(state.board.tiles.find((tile) => tile.id === action.tile)?.number ?? null),
    ).toBe(Math.max(...eligible.map((tile) => pipWeight(tile.number))));
  });

  it('accepts an offer that completes its build target', () => {
    const initial = giveHands(setup(), {
      0: { ...resourceMap(), ore: 2 },
      1: { ...resourceMap(), lumber: 2, grain: 2, ore: 2 },
    });
    const state: GameState = {
      ...initial,
      tradeOffer: {
        proposer: 0,
        give: { ...resourceMap(), ore: 1 },
        want: { ...resourceMap(), lumber: 1 },
        responses: { 1: 'pending' },
        counters: {},
      },
    };
    expect(chooseAction(state, 1)).toMatchObject({ type: 'respondTrade', response: 'accept' });
  });

  it('edits a useful counteroffer then counters once', () => {
    const initial = giveHands(setup(), {
      0: { ...resourceMap(), wool: 1, ore: 3 },
      1: { ...resourceMap(), lumber: 2, grain: 2, ore: 2 },
    });
    let state: GameState = {
      ...initial,
      tradeOffer: {
        proposer: 0,
        give: { ...resourceMap(), wool: 1 },
        want: { ...resourceMap(), ore: 1 },
        responses: { 1: 'pending' },
        counters: {},
      },
      tradeDrafts: {
        ...initial.tradeDrafts,
        1: { give: { ...resourceMap(), ore: 1 }, want: { ...resourceMap(), wool: 1 }, target: 0 },
      },
    };
    for (let index = 0; index < 10 && state.tradeOffer?.responses[1] === 'pending'; index += 1)
      state = reduce(state, chooseAction(state, 1));
    expect(state.tradeOffer?.responses[1]).toBe('countered');
    expect(state.tradeOffer?.counters[1]).toMatchObject({ give: { lumber: 1 }, want: { ore: 1 } });
    expect(legalActions(state, 1)).toEqual([]);
  });

  it('finishes a seeded game without rule violations and conserves every resource', () => {
    const result = simulateGame(17);
    expect(result.turns).toBeLessThan(400);
    expect(result.actions).toBeGreaterThan(16);
    expect(simulateGame(17)).toEqual(result);
  });
});
