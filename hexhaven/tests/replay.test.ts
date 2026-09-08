import { describe, expect, it } from 'vitest';
import { actionKey } from '../src/core/actions';
import { getActor, legalActions } from '../src/core/legal';
import { replay } from '../src/core/log';
import { reduce } from '../src/core/reducer';
import { createGame, RESOURCES } from '../src/core/state';

describe('deterministic replay', () => {
  it('replays seeded setup, production, bandit choices, and turns to an identical state', () => {
    const options = {
      seed: 731,
      layout: 'random' as const,
      players: Array.from({ length: 4 }, (_, i) => ({ name: `Player ${i}`, kind: 'bot' as const })),
    };
    let state = createGame(options);
    for (let index = 0; index < 400; index++) {
      const legal = legalActions(state, getActor(state));
      const action =
        legal.find((a) => a.type === 'buildTown') ??
        legal.find((a) => a.type === 'placeVillage') ??
        legal.find((a) => a.type === 'placeRoad') ??
        legal.find((a) => a.type === 'roll') ??
        legal.find((a) => a.type === 'discard') ??
        legal.find((a) => a.type === 'moveBandit') ??
        legal.find((a) => a.type === 'steal') ??
        legal.find((a) => a.type === 'buyDev') ??
        legal.find((a) => a.type === 'endTurn');
      if (!action) throw new Error(`No actionable choice in ${state.phase.type}.`);
      state = reduce(state, action);
      for (const r of RESOURCES)
        expect(state.bank[r] + state.players.reduce((sum, p) => sum + p.hand[r], 0)).toBe(19);
      if (state.phase.type === 'gameOver') break;
    }
    const parsed: unknown = JSON.parse(JSON.stringify(state.actions));
    expect(actionKey(parsed)).toBe(actionKey(state.actions));
    expect(replay(options, state.actions)).toEqual(state);
    expect(state.log).toHaveLength(state.actions.length);
  });
});
