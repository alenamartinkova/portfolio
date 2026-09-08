import { describe, expect, it } from 'vitest';
import { exportReplay, parseReplay } from '../src/app/persistence';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/app/settings';
import { legalActions } from '../src/core/legal';
import { replay } from '../src/core/log';
import { reduce } from '../src/core/reducer';
import { createGame } from '../src/core/state';
import type { GameOptions } from '../src/core/state';

const options: GameOptions = {
  seed: 42,
  layout: 'beginner',
  players: [
    { name: 'Harbour keeper', kind: 'human' },
    { name: 'River trader', kind: 'bot', difficulty: 'normal' },
  ],
};

describe('replay persistence guards', () => {
  it('exports only a versioned options/action envelope and replays it exactly', () => {
    const initial = createGame(options);
    const action = legalActions(initial, 0)[0];
    if (action === undefined) throw new Error('Expected a setup action.');
    const state = reduce(initial, action);
    const parsed = parseReplay(exportReplay(state));
    expect(Object.keys(parsed).sort()).toEqual(['actions', 'options', 'version']);
    expect(replay(parsed.options, parsed.actions)).toEqual(state);
    expect(parsed.actions).not.toBe(state.actions);
  });

  it('supports already parsed envelopes without relying on JSON object key order', () => {
    const parsed = parseReplay({ actions: [], options, version: 1 });
    expect(parsed).toEqual({ version: 1, options, actions: [] });
    expect(parsed.options).not.toBe(options);
  });

  it('rejects invalid JSON, versions, and missing action lists', () => {
    expect(() => parseReplay('{')).toThrow('valid JSON');
    for (const value of [null, [], {}, { version: 2, options, actions: [] }]) {
      expect(() => parseReplay(value)).toThrow('version 1');
    }
    expect(() => parseReplay({ version: 1, options })).toThrow('action list');
    expect(() => parseReplay({ version: 1, options, actions: new Array<unknown>(1) })).toThrow(
      'action 1',
    );
  });

  it('rejects malformed seeds, layouts, players, and difficulties', () => {
    const invalid = [
      { ...options, seed: NaN },
      { ...options, seed: 3.5 },
      { ...options, layout: 'ocean' },
      { ...options, players: [] },
      { ...options, players: [{ name: 'One', kind: 'human' }] },
      {
        ...options,
        players: [
          { name: '', kind: 'human' },
          { name: 'Two', kind: 'bot' },
        ],
      },
      {
        ...options,
        players: [
          { name: 'One', kind: 'robot' },
          { name: 'Two', kind: 'bot' },
        ],
      },
      {
        ...options,
        players: [
          { name: 'One', kind: 'human' },
          { name: 'Two', kind: 'bot', difficulty: 'impossible' },
        ],
      },
    ];
    for (const value of invalid) {
      expect(() => parseReplay({ version: 1, options: value, actions: [] })).toThrow();
    }
  });

  it('rejects malformed actions and player ids before invoking the reducer', () => {
    const invalid: unknown[] = [
      null,
      { type: 'unknown', player: 0 },
      { type: 'endTurn', player: -1 },
      { type: 'endTurn', player: 2 },
      { type: 'placeVillage', player: 0, vertex: 123 },
      { type: 'roll', player: 0, dice: [1, 7], rng: 1 },
      { type: 'discard', player: 0, resource: 'gold' },
      { type: 'respondTrade', player: 0, response: { toString: () => 'accept' } },
    ];
    for (const action of invalid) {
      expect(() => parseReplay({ version: 1, options, actions: [action] })).toThrow('action 1');
    }
  });

  it('lets core replay reject structurally valid but illegal actions visibly', () => {
    const parsed = parseReplay({ version: 1, options, actions: [{ type: 'endTurn', player: 0 }] });
    expect(() => replay(parsed.options, parsed.actions)).toThrow();
  });
});

describe('local settings guards', () => {
  it('ships muted with four players, and safely defaults malformed input', () => {
    expect(DEFAULT_SETTINGS.sound).toBe(false);
    expect(DEFAULT_SETTINGS.playerCount).toBe(4);
    for (const input of [null, undefined, 'bad', 4]) {
      expect(normalizeSettings(input)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('preserves valid preferences while recovering invalid fields', () => {
    expect(
      normalizeSettings({
        animationSpeed: 'fast',
        sound: true,
        colorBlind: true,
        layout: 'random',
        playerCount: 3,
        botCount: 2,
        difficulty: 'hard',
        seed: 123,
      }),
    ).toEqual({
      animationSpeed: 'fast',
      sound: true,
      colorBlind: true,
      layout: 'random',
      playerCount: 3,
      botCount: 2,
      difficulty: 'hard',
      seed: 123,
    });
    expect(normalizeSettings({ animationSpeed: 20, sound: 'yes', seed: Infinity })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('limits bots to available opponent seats and supports hot-seat without bots', () => {
    expect(normalizeSettings({ playerCount: 2, botCount: 3 }).botCount).toBe(1);
    expect(normalizeSettings({ playerCount: 4, botCount: 0 }).botCount).toBe(0);
    expect(normalizeSettings({ playerCount: 5, botCount: -1 })).toEqual(DEFAULT_SETTINGS);
  });
});
