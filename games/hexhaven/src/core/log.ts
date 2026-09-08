import type { Action } from './actions';
import { DEV_CARD_NAMES } from './devcards';
import { createGame, getPlayer } from './state';
import type { GameOptions, GameState } from './state';
import { reduce } from './reducer';
export interface LogEntry {
  readonly index: number;
  readonly turn: number;
  readonly player: number;
  readonly action: Action;
  readonly text: string;
  readonly location: string | null;
  readonly category: 'build' | 'trade' | 'roll' | 'card' | 'turn';
}
function describeAction(state: GameState, action: Action): string {
  const name = getPlayer(state, action.player).name;
  switch (action.type) {
    case 'placeVillage':
      return `${name} built a village.`;
    case 'placeRoad':
      return `${name} built a road.`;
    case 'buildTown':
      return `${name} upgraded a village to a town.`;
    case 'roll':
      return `${name} rolled ${action.dice[0] + action.dice[1]} (${action.dice.join(' + ')}).`;
    case 'discard':
      return `${name} returned 1 ${action.resource} to the bank.`;
    case 'moveBandit':
      return `${name} moved the bandit.`;
    case 'steal':
      return `${name} stole a resource from ${getPlayer(state, action.victim).name}.`;
    case 'bankTrade':
      return `${name} traded ${action.ratio} ${action.give} for 1 ${action.receive}.`;
    case 'buyDev':
      return `${name} bought a development card.`;
    case 'playDev': {
      const card = getPlayer(state, action.player).devCards.find((c) => c.id === action.card);
      return `${name} played ${card ? DEV_CARD_NAMES[card.kind] : 'a development card'}.`;
    }
    case 'takePlenty':
      return `${name} took 1 ${action.resource} from the bank.`;
    case 'monopoly':
      return `${name} claimed all opposing ${action.resource}.`;
    case 'proposeTrade':
      return `${name} proposed a trade.`;
    case 'respondTrade':
      return `${name} chose to ${action.response} the trade.`;
    case 'acceptCounter':
      return `${name} accepted ${getPlayer(state, action.opponent).name}'s counteroffer.`;
    case 'declineCounter':
      return `${name} declined a counteroffer.`;
    case 'cancelTrade':
      return `${name} closed the trade offer.`;
    case 'endTurn':
      return `${name} ended their turn.`;
    case 'editTrade':
    case 'targetTrade':
      return `${name} adjusted a trade proposal.`;
  }
}
export function appendLog(before: GameState, after: GameState, action: Action): GameState {
  const location =
    'vertex' in action
      ? action.vertex
      : 'edge' in action
        ? action.edge
        : 'tile' in action
          ? action.tile
          : null;
  const category: LogEntry['category'] = ['placeVillage', 'placeRoad', 'buildTown'].includes(
    action.type,
  )
    ? 'build'
    : action.type.toLowerCase().includes('trade') || action.type.includes('Counter')
      ? 'trade'
      : action.type === 'roll'
        ? 'roll'
        : ['playDev', 'buyDev', 'monopoly', 'takePlenty'].includes(action.type)
          ? 'card'
          : 'turn';
  return {
    ...after,
    actions: [...before.actions, action],
    log: [
      ...before.log,
      {
        index: before.actions.length,
        turn: before.turn,
        player: action.player,
        action,
        text: describeAction(before, action),
        location,
        category,
      },
    ],
  };
}
export function replay(options: GameOptions, actions: readonly Action[]): GameState {
  return actions.reduce(reduce, createGame(options));
}
