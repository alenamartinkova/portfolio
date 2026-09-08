export type DevKind = 'guard' | 'victoryPoint' | 'roadBuilding' | 'yearOfPlenty' | 'monopoly';
export const DEV_CARD_NAMES: Readonly<Record<DevKind, string>> = {
  guard: 'Guard',
  victoryPoint: 'Victory point',
  roadBuilding: 'Road building',
  yearOfPlenty: 'Year of plenty',
  monopoly: 'Monopoly',
};
export interface DevCard {
  readonly id: number;
  readonly kind: DevKind;
  readonly boughtTurn: number;
}
export function createDevDeck(): DevKind[] {
  return [
    ...Array<DevKind>(14).fill('guard'),
    ...Array<DevKind>(5).fill('victoryPoint'),
    ...Array<DevKind>(2).fill('roadBuilding'),
    ...Array<DevKind>(2).fill('yearOfPlenty'),
    ...Array<DevKind>(2).fill('monopoly'),
  ];
}
