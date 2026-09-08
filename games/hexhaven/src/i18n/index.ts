import type { Resource } from '../core/board';
import { DEV_CARD_NAMES, type DevKind } from '../core/devcards';
import type { LogEntry } from '../core/log';
import type { GameState, Player } from '../core/state';
import { getLocale, localize } from './locale';
export { getLocale, setLocale, localize, type Locale } from './locale';

const resources: Readonly<Record<Resource, readonly [string, string]>> = {
  lumber: ['Lumber', 'Drevo'],
  grain: ['Grain', 'Obilie'],
  wool: ['Wool', 'Vlna'],
  brick: ['Brick', 'Tehla'],
  ore: ['Ore', 'Ruda'],
};
const cards: Readonly<Record<DevKind, string>> = {
  guard: 'Strážca',
  victoryPoint: 'Víťazný bod',
  roadBuilding: 'Stavba ciest',
  yearOfPlenty: 'Rok hojnosti',
  monopoly: 'Monopol',
};
export const resourceName = (resource: Resource): string => localize(...resources[resource]);
export const devCardName = (kind: DevKind): string => localize(DEV_CARD_NAMES[kind], cards[kind]);

export function playerName(player: Player): string {
  if (getLocale() !== 'sk' || player.kind !== 'human') return player.name;
  if (player.name === 'You') return 'Ty';
  const generated = /^Trader (\d+)$/.exec(player.name);
  return generated ? `Hráč ${generated[1]}` : player.name;
}

/** Translate structured actions rather than altering the append-only English replay log. */
export function logText(game: GameState, entry: LogEntry): string {
  if (getLocale() === 'en') return entry.text;
  const action = entry.action;
  const nameOf = (id: number): string => {
    const player = game.players[id];
    return player ? playerName(player) : `Hráč ${id + 1}`;
  };
  const name = nameOf(action.player);
  switch (action.type) {
    case 'placeVillage':
      return `${name}: postavená dedina.`;
    case 'placeRoad':
      return `${name}: postavená cesta.`;
    case 'buildTown':
      return `${name}: dedina rozšírená na mesto.`;
    case 'roll':
      return `${name}: hod ${action.dice[0] + action.dice[1]} (${action.dice.join(' + ')}).`;
    case 'discard':
      return `${name}: do banky vrátená 1 karta – ${resourceName(action.resource).toLowerCase()}.`;
    case 'moveBandit':
      return `${name}: zbojník presunutý.`;
    case 'steal':
      return `${name}: získaná náhodná surovina. Protihráč: ${nameOf(action.victim)}.`;
    case 'bankTrade':
      return `${name}: výmena ${action.ratio} × ${resourceName(action.give).toLowerCase()} za 1 × ${resourceName(action.receive).toLowerCase()}.`;
    case 'buyDev':
      return `${name}: kúpená rozvojová karta.`;
    case 'playDev': {
      const kind = game.deck[action.card];
      return `${name}: zahraná karta ${kind ? devCardName(kind) : 'rozvoja'}.`;
    }
    case 'takePlenty':
      return `${name}: z banky získaná 1 karta – ${resourceName(action.resource).toLowerCase()}.`;
    case 'monopoly':
      return `${name}: od ostatných získané všetky karty suroviny ${resourceName(action.resource).toLowerCase()}.`;
    case 'proposeTrade':
      return `${name}: navrhnutý obchod.`;
    case 'respondTrade':
      return `${name}: ${action.response === 'accept' ? 'obchod prijatý' : action.response === 'decline' ? 'obchod odmietnutý' : 'navrhnutá protiponuka'}.`;
    case 'acceptCounter':
      return `${name}: prijatá protiponuka hráča ${nameOf(action.opponent)}.`;
    case 'declineCounter':
      return `${name}: protiponuka odmietnutá.`;
    case 'cancelTrade':
      return `${name}: obchodná ponuka uzavretá.`;
    case 'endTurn':
      return `${name}: koniec ťahu.`;
    case 'editTrade':
    case 'targetTrade':
      return `${name}: obchodná ponuka upravená.`;
  }
}

export { translateMessage } from './messages';
