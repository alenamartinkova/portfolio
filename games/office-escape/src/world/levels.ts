import { PLAYER_HEIGHT } from '../player/PlayerController';
import type { TextKey } from '../i18n';
export interface Stop {
    x: number;
    z: number;
    y: number;
    w: number;
    d: number;
    kind: 'desk' | 'cabinet' | 'chair' | 'table' | 'counter' | 'cart' | 'box' | 'sofa' | 'shelf' | 'ledge' | 'beam';
    checkpoint?: number;
    /** Height of the supporting storey; furniture keeps its normal proportions. */
    base?: number;
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
export type Architecture = 'office' | 'lobby' | 'depot' | 'servers' | 'shaft' | 'archive' | 'rooftop' | 'atrium' | 'lockdown' | 'finale';
export interface OfficeLevel {
  id: string; name: TextKey; briefing: TextKey; route: Stop[]; cards: number[];
  gates: SecurityGate[]; par: number; sky: string; floor: string;
  architecture: Architecture;
  areas: [TextKey, TextKey, TextKey, TextKey];
  exit: { x: number; y: number; z: number };
}
type Point = [x: number, z: number, y: number, kind?: Stop['kind'], w?: number, d?: number];
/** Coordinates are authored in three dimensions, independently for each route. */
function path(points: Point[], checkpoints: number[], width = 2.6): Stop[] {
  return points.map(([x, z, y, kind = 'ledge', w = width, d = width], i) => ({
    x, z, y, kind, w: checkpoints.includes(i) ? Math.max(3.2, w) : w,
    d: checkpoints.includes(i) ? Math.max(2.8, d) : d,
    base: kind === 'ledge' || kind === 'beam' ? y - .3 : Math.max(0, y - 1.4),
    ...(checkpoints.includes(i) ? { checkpoint: checkpoints.indexOf(i) } : {}),
  }));
}
function gates(indices: number[], active = 2.8): SecurityGate[] {
  return indices.map((after, i) => ({ after, period: 6.4 - i * .2, active, phase: i * 1.35 }));
}
export const officeLevels: readonly OfficeLevel[] = [
  {
    id: 'first-evening', name: 'levelFirst', briefing: 'briefFirst', architecture: 'office',
    route: originalRoute.map(s => ({ ...s, kind: ['chair', 'cart', 'box'].includes(s.kind) ? 'cabinet' : s.kind,
      w: s.checkpoint !== undefined ? s.w : Math.max(1.6, s.w * 1.1), d: s.checkpoint !== undefined ? s.d : Math.max(1.7, s.d * 1.1) })),
    cards: [], gates: [], par: 100, sky: '#9eb9baff', floor: '#506868',
    areas: ['openOffice', 'meetings', 'coffee', 'final'], exit: { x: 3, y: 3, z: 73 },
  },
  {
    id: 'reception', name: 'levelReception', briefing: 'briefCards', architecture: 'lobby',
    route: path([
      [0,0,1.4,'counter'], [3.8,0,1.4,'sofa'], [7.6,0,1.5,'counter'], [10.8,2.8,1.5,'table'],
      [10.8,6.6,1.4,'sofa'], [10.8,10.4,1.8,'counter'], [7,12.4,1.8,'desk'], [3,12.4,1.5,'table'],
      [-1,12.4,1.4,'sofa'], [-5,12.4,1.8,'cabinet'], [-8.8,10.4,1.8,'counter'], [-8.8,6.6,1.5,'table'],
      [-8.8,2.8,1.4,'sofa'], [-5,2.8,1.8,'desk'], [-2,5.6,2.5,'cabinet'], [1.8,7,3.3,'counter'],
      [5.6,7,3.3,'table'],
    ], [0,5,10,15], 2.9),
    cards: [15], gates: [], par: 90, sky: '#e3d6bfff', floor: '#aa9478',
    areas: ['receptionArea', 'waitingArea', 'visitorArea', 'mezzanineArea'], exit: { x: 8.8, y: 3.3, z: 7 },
  },
  {
    id: 'rolling-stock', name: 'levelRolling', briefing: 'briefRolling', architecture: 'depot',
    route: path([
      [0,0,1.4,'cabinet'], [0,3.8,1.3,'cart'], [0,7.6,1.4,'table'], [0,11.4,1.4,'box'],
      [0,15.2,1.4,'cart'], [3.6,18,1.4,'counter'], [7.2,15.2,1.4,'table'], [7.2,11.4,1.4,'cart'],
      [7.2,7.6,1.4,'box'], [7.2,3.8,1.4,'cart'], [10.8,1,1.4,'cabinet'], [14.4,3.8,1.4,'box'],
      [14.4,7.6,1.4,'cart'], [14.4,11.4,1.4,'table'], [14.4,15.2,1.4,'cart'], [14.4,19,1.4,'counter'],
      [10.6,21.8,1.4,'box'], [6.8,24,1.4,'cart'], [3,24,1.8,'cabinet'], [0,27,2.5,'shelf'],
    ], [0,5,10,15], 2.4),
    cards: [5,15], gates: [], par: 130, sky: '#bdc8ceff', floor: '#596f7a',
    areas: ['dispatchArea', 'returnsArea', 'sortingArea', 'loadingArea'], exit: { x: 0, y: 2.5, z: 30.8 },
  },
  {
    id: 'security-training', name: 'levelSecurity', briefing: 'briefSecurity', architecture: 'servers',
    route: path([
      [0,0,1.4,'desk'], [3.8,0,1.4,'cabinet'], [7.6,0,1.8,'shelf'], [11.4,0,1.8,'cabinet'],
      [15.2,0,1.8,'shelf'], [15.2,4,1.8,'counter'], [11.4,4,1.8,'shelf'], [7.6,4,1.8,'cabinet'],
      [3.8,4,2.4,'shelf'], [0,4,3.1,'shelf'], [-3.8,4,3.1,'counter'], [-3.8,8,3.1,'shelf'],
      [0,8,3.1,'cabinet'], [3.8,8,3.1,'shelf'], [7.6,8,2.3,'cabinet'], [11.4,8,1.4,'counter'],
      [15.2,8,1.4,'shelf'], [15.2,12,1.8,'cabinet'], [11.4,12,2.5,'shelf'],
    ], [0,5,10,15], 2.4),
    cards: [10,15], gates: gates([2,12], 2.4), par: 135, sky: '#283d52ff', floor: '#263c50',
    areas: ['serverArea', 'firewallArea', 'cableArea', 'backupArea'], exit: { x: 7.6, y: 2.5, z: 12 },
  },
  {
    id: 'accounts', name: 'levelAccounts', briefing: 'briefShaft', architecture: 'shaft',
    route: path([
      [0,0,1.4], [3.6,0,2.3], [6.4,2.8,3.2], [6.4,6.4,4.1], [3.6,9.2,5], [0,9.2,5.9], [-2.8,6.4,6.8], [-2.8,2.8,7.7],
      [0,0,8.6], [3.6,0,9.5], [6.4,2.8,10.4], [6.4,6.4,11.3], [3.6,9.2,12.2], [0,9.2,13.1], [-2.8,6.4,14], [-2.8,2.8,14.9],
      [0,0,15.8], [3.6,0,16.7], [6.4,2.8,17.6], [6.4,6.4,18.5], [3.6,9.2,19.4], [0,9.2,20.3], [-2.8,6.4,21.2], [-2.8,2.8,22.1], [0,0,23],
    ], [0,8,16,24], 2.3),
    cards: [8,16,24], gates: gates([10,20]), par: 160, sky: '#6d8088ff', floor: '#384951',
    areas: ['shaftBaseArea', 'liftArea', 'counterweightArea', 'motorArea'], exit: { x: 0, y: 23, z: -3.8 },
  },
  {
    id: 'archive', name: 'levelArchive', briefing: 'briefArchive', architecture: 'archive',
    route: path([
      [0,0,1.4,'cabinet'], [-3,3,2.3,'shelf'], [-3,6.8,3.2,'shelf'], [0,9.6,4.1,'shelf'], [3.8,9.6,5,'shelf'],
      [7.6,9.6,5,'cabinet'], [7.6,13.4,4,'shelf'], [3.8,13.4,3,'shelf'], [0,13.4,2,'shelf'], [-3.8,13.4,1.4,'cart'],
      [-7.6,13.4,1.4,'counter'], [-7.6,17.2,2.3,'shelf'], [-3.8,17.2,3.2,'shelf'], [0,17.2,4.1,'shelf'], [3.8,17.2,5,'shelf'],
      [7.6,20.2,5.8,'cabinet'], [3.8,23.2,6.6,'shelf'], [0,23.2,7.4,'shelf'], [-3.8,23.2,8.2,'shelf'], [-7.6,23.2,9,'shelf'],
      [-7.6,27,9,'cabinet'],
    ], [0,5,10,15], 2.2),
    cards: [5,10,15], gates: gates([6,17]), par: 165, sky: '#c8ad8eff', floor: '#71604e',
    areas: ['catalogueArea', 'stacksArea', 'returnsArea', 'highArchiveArea'], exit: { x: -7.6, y: 9, z: 30.8 },
  },
  {
    id: 'night-shift', name: 'levelNight', briefing: 'briefDescent', architecture: 'rooftop',
    route: path([
      [0,0,18], [3.8,0,17.3], [7.6,0,16.6], [11.4,0,15.9], [14.8,2.8,15.2], [14.8,6.6,14.5],
      [11,9.4,13.8], [7.2,9.4,13.1], [3.4,9.4,12.4], [0,6.6,11.7], [0,2.8,11], [-3.8,0,10.3],
      [-7.6,0,9.6], [-11.4,2.8,8.9], [-11.4,6.6,8.2], [-7.6,9.4,7.5], [-3.8,9.4,6.8], [0,12.2,6.1],
      [3.8,12.2,5.4], [7.6,12.2,4.7], [11.4,12.2,4], [14.8,15,3.3],
    ], [0,5,10,15], 2),
    cards: [5,10,15], gates: gates([2,12,18]), par: 165, sky: '#172a49ff', floor: '#334154',
    areas: ['roofArea', 'ventArea', 'fireEscapeArea', 'serviceArea'], exit: { x: 14.8, y: 3.3, z: 18.8 },
  },
  {
    id: 'executive', name: 'levelExecutive', briefing: 'briefAtrium', architecture: 'atrium',
    route: path([
      [0,0,1.4,'counter'], [4,0,2.2,'desk'], [8,0,3,'desk'], [12,0,3.8], [16,0,4.6], [16,4,5.4,'counter'],
      [16,8,6.2], [12,8,7,'table'], [8,8,7.8], [4,8,8.6], [0,8,9.4,'counter'], [0,4,10.2],
      [0,0,11], [4,0,11.8,'desk'], [8,0,12.6], [12,0,13.4,'counter'], [16,0,14.2], [16,4,15],
      [16,8,15.8], [12,8,16.6,'table'], [8,8,17.4], [8,4,17.4,'beam',1.4,3], [8,0,17.4,'beam',1.4,3],
    ], [0,5,10,15], 2.2),
    cards: [5,10,15], gates: gates([7,20]), par: 180, sky: '#b7d4d5ff', floor: '#8b9995',
    areas: ['atriumArea', 'balconyArea', 'boardroomArea', 'skybridgeArea'], exit: { x: 8, y: 17.4, z: -3.8 },
  },
  {
    id: 'lockdown', name: 'levelLockdown', briefing: 'briefLockdown', architecture: 'lockdown',
    route: path([
      [0,0,1.4,'counter'], [3.8,0,1.4,'cart'], [7.6,0,2.3], [11.4,0,3.2], [11.4,4,4.1],
      [7.6,4,5,'counter'], [3.8,4,5,'beam',2.8,1.3], [0,4,5,'beam',2.8,1.3], [-3.8,4,4], [-7.6,4,3],
      [-7.6,8,2,'counter'], [-3.8,8,2,'beam',2.8,1.3], [0,8,2,'beam',2.8,1.3], [3.8,8,2.9], [7.6,8,3.8],
      [11.4,8,4.7,'counter'], [11.4,12,5.6], [7.6,12,6.5], [3.8,12,7.4], [0,12,8.3], [-3.8,12,9.2],
    ], [0,5,10,15], 1.9),
    cards: [5,10,15], gates: gates([2,6,11,17], 3.1), par: 185, sky: '#654d60ff', floor: '#4b4556',
    areas: ['securityArea', 'catwalkArea', 'isolationArea', 'overrideArea'], exit: { x: -7.6, y: 9.2, z: 12 },
  },
  {
    id: 'last-out', name: 'levelLast', briefing: 'briefLast', architecture: 'finale',
    route: path([
      [0,0,1.4,'desk'], [0,3.8,1.4,'cart'], [3.4,6.6,2.3], [6.8,6.6,3.2], [9.6,9.4,4.1], [9.6,13,5],
      [6.8,15.8,5.9], [3.4,15.8,6.8,'counter'], [0,13,7.7], [0,9.4,8.6], [3.4,6.6,9.5], [6.8,6.6,10.4],
      [10.2,6.6,10.4,'beam',2.8,1.3], [14,6.6,10.4,'beam',2.8,1.3], [17.8,6.6,10.4,'counter'],
      [17.8,10.4,9.4], [17.8,14.2,8.4], [17.8,18,7.4], [14,18,6.4], [10.2,18,5.4], [6.4,20.8,4.4],
      [6.4,24.6,4.4,'counter'], [10.2,24.6,5.3], [14,24.6,6.2], [17.8,24.6,7.1], [17.8,28.4,8],
      [14,28.4,8.9], [10.2,28.4,9.8],
    ], [0,7,14,21], 1.85),
    cards: [7,14,21], gates: gates([4,12,17,24], 3.2), par: 215, sky: '#768fa5ff', floor: '#475c67',
    areas: ['dispatchArea', 'liftArea', 'skybridgeArea', 'roofArea'], exit: { x: 6.4, y: 9.8, z: 28.4 },
  },
];
export function resolveOfficeLevel(id: string | null) { return officeLevels.find(level => level.id === id) ?? officeLevels[0]; }
export function atExit(level: OfficeLevel, position: { x: number; y: number; z: number }, grounded: boolean) {
  const e = level.exit;
  return grounded && Math.abs(position.x - e.x) < 2 && Math.abs(position.z - e.z) < 1.6
    && Math.abs(position.y - PLAYER_HEIGHT / 2 - e.y) < .25;
}
export const route = officeLevels[0].route;
