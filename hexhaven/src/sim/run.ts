import { chooseAction } from '../bots/heuristic';
import { getActor } from '../core/legal';
import { reduce } from '../core/reducer';
import { scoreBreakdown } from '../core/scoring';
import { createGame, RESOURCES, type GameState } from '../core/state';

export function assertConservation(state: GameState): void {
  for (const resource of RESOURCES) {
    const counts = [state.bank[resource], ...state.players.map((player) => player.hand[resource])];
    if (
      counts.some((count) => !Number.isInteger(count) || count < 0) ||
      counts.reduce((sum, count) => sum + count, 0) !== 19
    ) {
      throw new Error(
        `Resource conservation failed for ${resource} after action ${state.actions.length}: ${counts.join(',')}.`,
      );
    }
  }
}

export interface SimulationResult {
  readonly seed: number;
  readonly winner: number;
  readonly turns: number;
  readonly actions: number;
}

export function simulateGame(
  seed: number,
  layout: 'beginner' | 'random' = 'random',
): SimulationResult {
  let state = createGame({
    seed,
    layout,
    players: ['Moss', 'Tide', 'Sun', 'Plum'].map((name, id) => ({
      name,
      kind: 'bot',
      difficulty: id % 2 === 0 ? 'hard' : 'normal',
    })),
  });
  assertConservation(state);
  while (state.phase.type !== 'gameOver') {
    if (state.turn >= 400 || state.actions.length >= 12_000) {
      throw new Error(
        `Seed ${seed} exceeded the simulation budget at turn ${state.turn}; points ${state.players.map((player) => scoreBreakdown(state, player.id).total).join('/')}; ${state.actions.length} actions; hands ${JSON.stringify(state.players.map((player) => player.hand))}.`,
      );
    }
    state = reduce(state, chooseAction(state, getActor(state)));
    assertConservation(state);
  }
  const winner = state.phase.winner;
  if (state.activePlayer !== winner || scoreBreakdown(state, winner).total < 10)
    throw new Error(`Seed ${seed} produced an invalid own-turn victory.`);
  if (state.players.filter((player) => scoreBreakdown(state, player.id).total >= 10).length !== 1)
    throw new Error(`Seed ${seed} ended with multiple players at ten points.`);
  return { seed, winner, turns: state.turn, actions: state.actions.length };
}

function argument(name: string, fallback: number): number {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`--${name} must be a positive integer.`);
  return value;
}

export function runTournament(games: number, seed: number): readonly SimulationResult[] {
  const results: SimulationResult[] = [];
  const started = performance.now();
  for (let index = 0; index < games; index += 1) {
    results.push(simulateGame(seed + index));
    if ((index + 1) % 25 === 0) console.log(`Verified ${index + 1}/${games} games.`);
  }
  const turns = results.map((result) => result.turns).sort((first, second) => first - second);
  const percentile = (fraction: number): number =>
    turns[Math.min(turns.length - 1, Math.floor(turns.length * fraction))] ?? 0;
  console.log(
    JSON.stringify(
      {
        games,
        seed,
        wins: [0, 1, 2, 3].map((player) => ({
          player,
          wins: results.filter((result) => result.winner === player).length,
          rate: +(results.filter((result) => result.winner === player).length / games).toFixed(3),
        })),
        turns: {
          min: turns[0],
          median: percentile(0.5),
          p90: percentile(0.9),
          p99: percentile(0.99),
          max: turns.at(-1),
          mean: +(turns.reduce((sum, turn) => sum + turn, 0) / games).toFixed(1),
        },
        actions: results.reduce((sum, result) => sum + result.actions, 0),
        seconds: +((performance.now() - started) / 1000).toFixed(2),
      },
      null,
      2,
    ),
  );
  return results;
}

if (process.argv[1]?.endsWith('/sim/run.ts') === true)
  runTournament(argument('games', 300), argument('seed', 1));
