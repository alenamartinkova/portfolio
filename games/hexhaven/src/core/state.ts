import { createBoard } from './board';
import type { Board, Resource } from './board';
import type { Action } from './actions';
import { createDevDeck } from './devcards';
import type { DevCard, DevKind } from './devcards';
import { shuffle } from './rng';
import type { LogEntry } from './log';

export const RESOURCES = [
  'lumber',
  'grain',
  'wool',
  'brick',
  'ore',
] as const satisfies readonly Resource[];
export type ResourceMap = Readonly<Record<Resource, number>>;
export const resourceMap = (amount = 0): ResourceMap => ({
  lumber: amount,
  grain: amount,
  wool: amount,
  brick: amount,
  ore: amount,
});
export const handSize = (hand: ResourceMap): number =>
  RESOURCES.reduce((sum, r) => sum + hand[r], 0);
export type Difficulty = 'easy' | 'normal' | 'hard';
export interface PlayerConfig {
  readonly name: string;
  readonly kind: 'human' | 'bot';
  readonly difficulty?: Difficulty;
}
export interface GameOptions {
  readonly seed: number;
  readonly layout: 'beginner' | 'random';
  readonly players: readonly PlayerConfig[];
  /** Old saves retain their original setup rules. New games default to forward order. */
  readonly setupOrder?: 'forward' | 'snake';
}
export interface Player {
  readonly id: number;
  readonly name: string;
  readonly kind: 'human' | 'bot';
  readonly difficulty: Difficulty;
  readonly hand: ResourceMap;
  readonly devCards: readonly DevCard[];
  readonly guardsPlayed: number;
  readonly revealedVP: boolean;
}
export interface Building {
  readonly owner: number;
  readonly kind: 'village' | 'town';
}
type Phase =
  | { readonly type: 'setupVillage'; readonly step: number }
  | { readonly type: 'setupRoad'; readonly step: number; readonly vertex: string }
  | { readonly type: 'roll' }
  | { readonly type: 'action' }
  | { readonly type: 'discard'; readonly pending: Readonly<Record<number, number>> }
  | { readonly type: 'bandit'; readonly returnTo: 'roll' | 'action' }
  | {
      readonly type: 'steal';
      readonly tile: string;
      readonly victims: readonly number[];
      readonly returnTo: 'roll' | 'action';
    }
  | { readonly type: 'freeRoads'; readonly remaining: number }
  | { readonly type: 'plenty'; readonly remaining: number }
  | { readonly type: 'monopoly' }
  | { readonly type: 'gameOver'; readonly winner: number };
export interface TradeDraft {
  readonly give: ResourceMap;
  readonly want: ResourceMap;
  readonly target: number | null;
}
interface TradeOffer {
  readonly proposer: number;
  readonly give: ResourceMap;
  readonly want: ResourceMap;
  readonly responses: Readonly<Record<number, 'pending' | 'declined' | 'countered'>>;
  readonly counters: Readonly<Record<number, TradeDraft>>;
}
export interface GameState {
  readonly version: 1;
  readonly options: GameOptions;
  readonly board: Board;
  readonly rng: number;
  readonly players: readonly Player[];
  readonly bank: ResourceMap;
  readonly roads: Readonly<Record<string, number>>;
  readonly buildings: Readonly<Record<string, Building>>;
  readonly bandit: string;
  readonly deck: readonly DevKind[];
  readonly deckIndex: number;
  readonly activePlayer: number;
  readonly phase: Phase;
  readonly turn: number;
  readonly dice: readonly [number, number] | null;
  readonly devPlayed: boolean;
  readonly longestRouteHolder: number | null;
  readonly largestArmyHolder: number | null;
  readonly routeLengths: readonly number[];
  readonly tradeDrafts: Readonly<Record<number, TradeDraft>>;
  readonly tradeOffer: TradeOffer | null;
  readonly log: readonly LogEntry[];
  readonly actions: readonly Action[];
}
export const emptyTrade = (): TradeDraft => ({
  give: resourceMap(),
  want: resourceMap(),
  target: null,
});
export function createGame(options: GameOptions): GameState {
  if (
    !Number.isSafeInteger(options.seed) ||
    options.players.length < 2 ||
    options.players.length > 4
  )
    throw new Error('Choose two to four players and an integer seed.');
  const board = createBoard(options.layout, options.seed);
  const shuffled = shuffle(createDevDeck(), (options.seed ^ 0x9e3779b9) >>> 0);
  const desert = board.tiles.find((tile) => tile.terrain === 'desert');
  if (!desert) throw new Error('The board requires a desert.');
  const players: Player[] = options.players.map((p, id) => ({
    id,
    name: p.name,
    kind: p.kind,
    difficulty: p.difficulty ?? 'normal',
    hand: resourceMap(),
    devCards: [],
    guardsPlayed: 0,
    revealedVP: false,
  }));
  return {
    version: 1,
    options: { ...options, setupOrder: options.setupOrder ?? 'forward' },
    board,
    rng: shuffled.rng,
    players,
    bank: resourceMap(19),
    roads: {},
    buildings: {},
    bandit: desert.id,
    deck: shuffled.items,
    deckIndex: 0,
    activePlayer: 0,
    phase: { type: 'setupVillage', step: 0 },
    turn: 0,
    dice: null,
    devPlayed: false,
    longestRouteHolder: null,
    largestArmyHolder: null,
    routeLengths: players.map(() => 0),
    tradeDrafts: Object.fromEntries(players.map((p) => [p.id, emptyTrade()])),
    tradeOffer: null,
    log: [],
    actions: [],
  };
}
export function getPlayer(state: GameState, id: number): Player {
  const player = state.players[id];
  if (!player || player.id !== id) throw new Error(`Unknown player ${id}.`);
  return player;
}
export const COSTS = {
  road: { ...resourceMap(), lumber: 1, brick: 1 },
  village: { ...resourceMap(), lumber: 1, brick: 1, wool: 1, grain: 1 },
  town: { ...resourceMap(), grain: 2, ore: 3 },
  dev: { ...resourceMap(), wool: 1, grain: 1, ore: 1 },
} as const satisfies Record<string, ResourceMap>;
export const canAfford = (hand: ResourceMap, cost: ResourceMap): boolean =>
  RESOURCES.every((r) => hand[r] >= cost[r]);
export function piecesLeft(
  state: GameState,
  player: number,
): { roads: number; villages: number; towns: number } {
  const buildings = Object.values(state.buildings).filter((b) => b.owner === player);
  return {
    roads: 15 - Object.values(state.roads).filter((owner) => owner === player).length,
    villages: 5 - buildings.filter((b) => b.kind === 'village').length,
    towns: 4 - buildings.filter((b) => b.kind === 'town').length,
  };
}
