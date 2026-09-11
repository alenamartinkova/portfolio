import type { TextKey } from '../i18n';
export interface Stop {
    x: number;
    z: number;
    y: number;
    w: number;
    d: number;
    kind: 'desk' | 'cabinet' | 'chair' | 'table' | 'counter' | 'cart' | 'box' | 'sofa' | 'shelf';
    checkpoint?: number;
}
export const originalRoute: Stop[] = [
    { x: 0, z: 0, y: 1.4, w: 3.6, d: 2.5, kind: 'desk', checkpoint: 0 },
    { x: 2, z: 3.4, y: 1.2, w: 1.5, d: 1.5, kind: 'chair' },
    { x: 4, z: 6.5, y: 1.4, w: 3, d: 2, kind: 'desk' },
    { x: .5, z: 9.7, y: 1.8, w: 2.6, d: 1.8, kind: 'cabinet' },
    { x: -3, z: 12.6, y: 1.4, w: 3, d: 2.2, kind: 'desk' },
    { x: -5, z: 16.5, y: 1.4, w: 3.4, d: 2.8, kind: 'cabinet', checkpoint: 1 },
    { x: -1, z: 19.7, y: 1.4, w: 4.3, d: 2.2, kind: 'table' },
    { x: 3.5, z: 23.3, y: 1.35, w: 1.8, d: 2, kind: 'cart' },
    { x: 6, z: 27, y: 1.5, w: 3.7, d: 2.4, kind: 'table' },
    { x: 1.8, z: 30.8, y: 1.3, w: 3.2, d: 2, kind: 'sofa' },
    { x: -2.5, z: 34, y: 1.5, w: 3.4, d: 3, kind: 'counter', checkpoint: 2 },
    { x: -6.5, z: 37.5, y: 1.5, w: 3.2, d: 2, kind: 'counter' },
    { x: -3, z: 41, y: 1.35, w: 1.8, d: 2, kind: 'cart' },
    { x: 1, z: 44, y: 1.5, w: 3.1, d: 2.3, kind: 'table' },
    { x: 5, z: 47.5, y: 1.8, w: 1.7, d: 1.7, kind: 'box' },
    { x: 7, z: 51.5, y: 1.8, w: 3.5, d: 3, kind: 'cabinet', checkpoint: 3 },
    { x: 3, z: 55, y: 2.2, w: 2.5, d: 2, kind: 'shelf' },
    { x: -1, z: 58.8, y: 2.6, w: 2.4, d: 1.8, kind: 'shelf' },
    { x: -4.5, z: 62.4, y: 3, w: 3, d: 2, kind: 'cabinet' },
    { x: -1, z: 66.5, y: 3, w: 2.6, d: 2.4, kind: 'table' },
    { x: 3, z: 70, y: 3, w: 4, d: 3, kind: 'counter' },
];

export interface SecurityGate { after: number; period: number; active: number; phase: number }
export interface OfficeLevel {
  id: string; name: TextKey; briefing: TextKey; route: Stop[]; cards: number[];
  gates: SecurityGate[]; par: number; sky: string; floor: string;
}
function floorPlan(id: string, name: TextKey, briefing: TextKey, xs: number[], width: number,
  movable: number[], cards: number[], gates: number[], par: number, sky: string, floor: string): OfficeLevel {
  return { id, name, briefing, par, sky, floor, cards,
    route: originalRoute.map((stop, i) => ({ ...stop, x: xs[i],
      w: stop.checkpoint !== undefined ? stop.w : Math.max(1.6, stop.w * width),
      d: stop.checkpoint !== undefined ? stop.d : Math.max(1.7, stop.d * width),
      kind: movable.includes(i) ? (i % 2 ? 'cart' : 'box') : ['chair', 'cart', 'box'].includes(stop.kind) ? 'cabinet' : stop.kind,
    })),
    gates: gates.map((after, i) => ({ after, period: 6.5 - gates.length * .3, active: 2.2 + gates.length * .2, phase: i * 1.4 })),
  };
}
export const officeLevels: readonly OfficeLevel[] = [
  floorPlan('first-evening', 'levelFirst', 'briefFirst', [0,2,4,.5,-3,-5,-1,3.5,6,1.8,-2.5,-6.5,-3,1,5,7,3,-1,-4.5,-1,3], 1.1, [], [], [], 100, '#9eb9baff', '#506868'),
  floorPlan('reception', 'levelReception', 'briefCards', [0,-2,-4,-1,2,5,2,-2,-5,-2,2,5,2,-2,-5,-6,-3,1,4,1,3], 1.05, [3], [10], [], 110, '#abc8c3ff', '#577870'),
  floorPlan('rolling-stock', 'levelRolling', 'briefRolling', [0,3,5,2,-2,-5,-2,2,5,2,-2,-5,-2,2,5,7,4,0,-3,0,3], 1, [1,7,12], [5,15], [], 125, '#b8c5d2ff', '#566e80'),
  floorPlan('security-training', 'levelSecurity', 'briefSecurity', [0,-2,-5,-2,2,5,1,-3,-6,-2,2,6,3,-1,-4,-6,-2,2,5,1,3], 1, [3,12], [10], [7], 135, '#aab4ceff', '#64677f'),
  floorPlan('accounts', 'levelAccounts', 'briefPrecision', [0,1,4,1,-2,-5,-1,3,6,2,-2,-6,-2,2,6,7,3,-1,-4,0,3], .9, [1,7,14], [5,10], [12], 150, '#cad0b8ff', '#70795a'),
  floorPlan('archive', 'levelArchive', 'briefArchive', [0,-3,-5,-1,3,6,2,-2,-5,-1,3,6,2,-2,-5,-7,-3,1,4,0,3], .94, [3,7,12,14], [5,10,15], [7], 165, '#cbbcaaff', '#7c6859'),
  floorPlan('night-shift', 'levelNight', 'briefSecurity', [0,2,5,1,-3,-6,-2,2,6,2,-2,-6,-3,1,5,6,2,-2,-5,-1,3], .92, [1,7,12], [5,15], [7,12], 170, '#788caaff', '#45566d'),
  floorPlan('executive', 'levelExecutive', 'briefPrecision', [0,-2,-4,0,4,6,2,-2,-6,-2,2,6,2,-2,-6,-7,-3,1,5,1,3], .86, [3,7,12,14], [5,10,15], [12,17], 185, '#b3bdcfff', '#626278'),
  floorPlan('lockdown', 'levelLockdown', 'briefLockdown', [0,3,5,1,-3,-6,-2,2,6,2,-2,-6,-2,2,6,7,3,-1,-5,-1,3], .9, [1,3,7,12,14], [5,10,15], [7,12,17], 200, '#a4b4c3ff', '#586777'),
  floorPlan('last-out', 'levelLast', 'briefLast', [0,-3,-5,-1,3,6,2,-2,-6,-2,2,6,2,-2,-6,-7,-3,1,5,1,3], .84, [1,3,7,12,14], [5,10,15], [7,12,17], 210, '#8a9ab8ff', '#50586e'),
];
export function resolveOfficeLevel(id: string | null) { return officeLevels.find(level => level.id === id) ?? officeLevels[0]; }
// Kept as the default route for existing controller tests and tools.
export const route = officeLevels[0].route;
