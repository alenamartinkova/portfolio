import { longestRoute, chooseRouteHolder } from './route';
import type { GameState } from './state';
import { getPlayer } from './state';

interface ScoreBreakdown {
  readonly buildings: number;
  readonly largestArmy: number;
  readonly longestRoute: number;
  readonly victoryCards: number;
  readonly total: number;
}
export function scoreBreakdown(state: GameState, player: number): ScoreBreakdown {
  const buildings = Object.values(state.buildings).reduce(
    (sum, b) => sum + (b.owner === player ? (b.kind === 'town' ? 2 : 1) : 0),
    0,
  );
  const largestArmy = state.largestArmyHolder === player ? 2 : 0;
  const route = state.longestRouteHolder === player ? 2 : 0;
  const victoryCards = getPlayer(state, player).devCards.filter(
    (card) => card.kind === 'victoryPoint',
  ).length;
  return {
    buildings,
    largestArmy,
    longestRoute: route,
    victoryCards,
    total: buildings + largestArmy + route + victoryCards,
  };
}
export const publicVP = (state: GameState, player: number): number => {
  const score = scoreBreakdown(state, player);
  return score.total - (getPlayer(state, player).revealedVP ? 0 : score.victoryCards);
};
export function updateAwards(state: GameState, roadsChanged: boolean): GameState {
  const routeLengths = roadsChanged
    ? state.players.map((p) => longestRoute(state.board, state.roads, state.buildings, p.id))
    : state.routeLengths;
  const formerHolder = state.longestRouteHolder;
  // A newly interrupted route loses tie priority; ordinary extensions retain it.
  const holderWasInterrupted =
    formerHolder !== null &&
    (routeLengths[formerHolder] ?? 0) < (state.routeLengths[formerHolder] ?? 0);
  const longestRouteHolder = chooseRouteHolder(
    routeLengths,
    holderWasInterrupted ? null : formerHolder,
  );
  const largestArmyHolder = chooseRouteHolder(
    state.players.map((p) => p.guardsPlayed),
    state.largestArmyHolder,
    3,
  );
  return { ...state, routeLengths, longestRouteHolder, largestArmyHolder };
}
