import type { Resource } from './board';
import { canAfford, handSize, RESOURCES } from './state';
import type { GameState, ResourceMap, TradeDraft } from './state';

export function tradeRatio(state: GameState, player: number, resource: Resource): number {
  let ratio = 4;
  for (const harbour of state.board.harbours) {
    if (!harbour.vertices.some((vertex) => state.buildings[vertex]?.owner === player)) continue;
    if (harbour.resource === resource) ratio = 2;
    else if (harbour.resource === null) ratio = Math.min(ratio, 3);
  }
  return ratio;
}
export function validBasket(draft: TradeDraft, hand: ResourceMap): boolean {
  return (
    handSize(draft.give) > 0 &&
    handSize(draft.want) > 0 &&
    RESOURCES.every(
      (r) =>
        Number.isInteger(draft.give[r]) &&
        Number.isInteger(draft.want[r]) &&
        draft.give[r] >= 0 &&
        draft.want[r] >= 0 &&
        !(draft.give[r] && draft.want[r]),
    ) &&
    canAfford(hand, draft.give)
  );
}
export function missingResources(hand: ResourceMap, cost: ResourceMap): ResourceMap {
  return Object.fromEntries(
    RESOURCES.map((r) => [r, Math.max(0, cost[r] - hand[r])]),
  ) as ResourceMap;
}
