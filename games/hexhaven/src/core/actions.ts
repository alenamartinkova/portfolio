import type { Resource } from './board';

export type Action =
  | { readonly type: 'placeVillage'; readonly player: number; readonly vertex: string }
  | { readonly type: 'placeRoad'; readonly player: number; readonly edge: string }
  | { readonly type: 'buildTown'; readonly player: number; readonly vertex: string }
  | {
      readonly type: 'roll';
      readonly player: number;
      readonly dice: readonly [number, number];
      readonly rng: number;
    }
  | { readonly type: 'discard'; readonly player: number; readonly resource: Resource }
  | { readonly type: 'moveBandit'; readonly player: number; readonly tile: string }
  | {
      readonly type: 'steal';
      readonly player: number;
      readonly victim: number;
      readonly resource: Resource;
      readonly rng: number;
    }
  | {
      readonly type: 'bankTrade';
      readonly player: number;
      readonly give: Resource;
      readonly receive: Resource;
      readonly ratio: number;
    }
  | { readonly type: 'buyDev'; readonly player: number }
  | { readonly type: 'playDev'; readonly player: number; readonly card: number }
  | { readonly type: 'takePlenty'; readonly player: number; readonly resource: Resource }
  | { readonly type: 'monopoly'; readonly player: number; readonly resource: Resource }
  | {
      readonly type: 'editTrade';
      readonly player: number;
      readonly side: 'give' | 'want';
      readonly resource: Resource;
      readonly delta: 1 | -1;
    }
  | { readonly type: 'targetTrade'; readonly player: number; readonly target: number | null }
  | { readonly type: 'proposeTrade'; readonly player: number }
  | {
      readonly type: 'respondTrade';
      readonly player: number;
      readonly response: 'accept' | 'decline' | 'counter';
    }
  | { readonly type: 'acceptCounter'; readonly player: number; readonly opponent: number }
  | { readonly type: 'declineCounter'; readonly player: number; readonly opponent: number }
  | { readonly type: 'cancelTrade'; readonly player: number }
  | { readonly type: 'endTurn'; readonly player: number };

export class RuleViolation extends Error {
  readonly code = 'ILLEGAL_ACTION';
  constructor(message: string) {
    super(message);
    this.name = 'RuleViolation';
  }
}

const resources = new Set(['lumber', 'grain', 'wool', 'brick', 'ore']);
const resource = (value: unknown): boolean => typeof value === 'string' && resources.has(value);
const integer = (value: unknown): boolean =>
  typeof value === 'number' && Number.isSafeInteger(value);
export function isAction(value: unknown): value is Action {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    !('player' in value) ||
    !integer(value.player)
  )
    return false;
  switch (value.type) {
    case 'placeVillage':
    case 'buildTown':
      return 'vertex' in value && typeof value.vertex === 'string';
    case 'placeRoad':
      return 'edge' in value && typeof value.edge === 'string';
    case 'roll':
      return (
        'dice' in value &&
        Array.isArray(value.dice) &&
        value.dice.length === 2 &&
        [value.dice[0], value.dice[1]].every(
          (n: unknown) => integer(n) && Number(n) >= 1 && Number(n) <= 6,
        ) &&
        'rng' in value &&
        integer(value.rng)
      );
    case 'discard':
    case 'takePlenty':
    case 'monopoly':
      return 'resource' in value && resource(value.resource);
    case 'moveBandit':
      return 'tile' in value && typeof value.tile === 'string';
    case 'steal':
      return (
        'victim' in value &&
        integer(value.victim) &&
        'resource' in value &&
        resource(value.resource) &&
        'rng' in value &&
        integer(value.rng)
      );
    case 'bankTrade':
      return (
        'give' in value &&
        resource(value.give) &&
        'receive' in value &&
        resource(value.receive) &&
        'ratio' in value &&
        integer(value.ratio)
      );
    case 'playDev':
      return 'card' in value && integer(value.card);
    case 'editTrade':
      return (
        'side' in value &&
        (value.side === 'give' || value.side === 'want') &&
        'resource' in value &&
        resource(value.resource) &&
        'delta' in value &&
        (value.delta === 1 || value.delta === -1)
      );
    case 'targetTrade':
      return 'target' in value && (value.target === null || integer(value.target));
    case 'respondTrade':
      return (
        'response' in value &&
        typeof value.response === 'string' &&
        ['accept', 'decline', 'counter'].includes(value.response)
      );
    case 'acceptCounter':
    case 'declineCounter':
      return 'opponent' in value && integer(value.opponent);
    case 'buyDev':
    case 'proposeTrade':
    case 'cancelTrade':
    case 'endTurn':
      return true;
    default:
      return false;
  }
}

/** Key order is irrelevant to action identity, including actions parsed from replays. */
export function actionKey(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item: unknown) => actionKey(item)).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${actionKey(Reflect.get(value, key))}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
