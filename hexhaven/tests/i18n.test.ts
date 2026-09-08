import { afterEach, describe, expect, it } from 'vitest';
import type { Action } from '../src/core/actions';
import { legalActions } from '../src/core/legal';
import type { LogEntry } from '../src/core/log';
import { replay } from '../src/core/log';
import { reduce } from '../src/core/reducer';
import { createGame, RESOURCES } from '../src/core/state';
import { exportReplay } from '../src/app/persistence';
import {
  devCardName,
  getLocale,
  logText,
  playerName,
  resourceName,
  setLocale,
  translateMessage,
} from '../src/i18n';

const initial = () =>
  createGame({
    seed: 1,
    layout: 'beginner',
    players: [
      { name: 'You', kind: 'human' },
      { name: 'Mira', kind: 'bot' },
    ],
  });
afterEach(() => setLocale('en'));

describe('language-independent game history', () => {
  it('switches an existing action log without changing state or its exported replay', () => {
    const start = initial();
    const village = legalActions(start, 0).find((action) => action.type === 'placeVillage');
    if (!village) throw new Error('A first village must be available.');
    const game = reduce(start, village);
    const entry = game.log[0];
    if (!entry) throw new Error('The village must be logged.');
    const frozen = structuredClone(game);
    const exported = exportReplay(game);
    expect(logText(game, entry)).toBe('You built a village.');
    setLocale('sk');
    expect(getLocale()).toBe('sk');
    expect(logText(game, entry)).toBe('Ty: postavená dedina.');
    expect(game).toEqual(frozen);
    expect(exportReplay(game)).toBe(exported);
    expect(replay(game.options, game.actions)).toEqual(frozen);
    setLocale('en');
    expect(logText(game, entry)).toBe(entry.text);
  });

  it('localizes a played card even after it has left the hand', () => {
    const game = initial();
    const card = game.deck.indexOf('yearOfPlenty');
    expect(card).toBeGreaterThanOrEqual(0);
    expect(game.players[0]?.devCards).toEqual([]);
    const entry: LogEntry = {
      index: 0,
      turn: 4,
      player: 0,
      action: { type: 'playDev', player: 0, card },
      text: 'You played Year of plenty.',
      location: null,
      category: 'card',
    };
    setLocale('sk');
    expect(logText(game, entry)).toBe('Ty: zahraná karta Rok hojnosti.');
  });

  it.each([
    [{ type: 'discard', player: 0, resource: 'wool' }, 'vlna'],
    [
      { type: 'bankTrade', player: 0, give: 'lumber', receive: 'ore', ratio: 4 },
      '4 × drevo za 1 × ruda',
    ],
    [{ type: 'steal', player: 0, victim: 1, resource: 'grain', rng: 1 }, 'Protihráč: Mira'],
    [{ type: 'respondTrade', player: 0, response: 'counter' }, 'navrhnutá protiponuka'],
    [{ type: 'monopoly', player: 0, resource: 'brick' }, 'tehla'],
    [{ type: 'roll', player: 0, dice: [3, 4], rng: 1 }, 'hod 7 (3 + 4)'],
  ] satisfies [Action, string][])('localizes structured %j', (action, expected) => {
    const game = initial();
    setLocale('sk');
    expect(
      logText(game, {
        action,
        player: action.player,
        index: 0,
        turn: 1,
        text: '',
        location: null,
        category: 'turn',
      }),
    ).toContain(expected);
  });
});

describe('Slovak terminology and diagnostics', () => {
  it('translates resource/card names while preserving user names', () => {
    setLocale('sk');
    expect(RESOURCES.map(resourceName)).toEqual(['Drevo', 'Obilie', 'Vlna', 'Tehla', 'Ruda']);
    expect(
      ['guard', 'victoryPoint', 'roadBuilding', 'yearOfPlenty', 'monopoly'].map((kind) =>
        devCardName(kind as Parameters<typeof devCardName>[0]),
      ),
    ).toEqual(['Strážca', 'Víťazný bod', 'Stavba ciest', 'Rok hojnosti', 'Monopol']);
    const player = initial().players[0];
    if (!player) throw new Error('Expected a player.');
    expect(playerName({ ...player, name: 'Trader 2' })).toBe('Hráč 2');
    expect(playerName({ ...player, name: 'Zuzana' })).toBe('Zuzana');
    expect(playerName({ ...player, name: 'You', kind: 'bot' })).toBe('You');
  });

  it('localizes actionable errors and keyboard instructions, retaining English diagnostics', () => {
    const diagnostic =
      'That action is unavailable in this phase. Choose one of the available actions.';
    expect(translateMessage(diagnostic)).toBe(diagnostic);
    setLocale('sk');
    expect(translateMessage(diagnostic)).toBe(
      'Táto akcia teraz nie je dostupná. Vyber jednu z dostupných akcií.',
    );
    expect(translateMessage('Location 2 of 54. Press Enter to confirm a village.')).toBe(
      'Miesto 2 z 54. Klávesom Enter potvrď stavbu dediny.',
    );
    expect(translateMessage('Replay action 7 is malformed.')).toContain('Ťah 7');
    expect(
      translateMessage('The saved game could not be restored. The replay is not valid JSON.'),
    ).toContain('Súbor nemá platný formát JSON.');
    expect(translateMessage('Saved on this device')).toBe('Uložené v tomto zariadení');
  });
});
