import type { TextKey } from "../i18n";
export type Point = readonly [number, number];
export type CargoKind = "piano" | "ceramics" | "generator";
export interface MissionDefinition {
  id: string;
  title: string;
  heading: TextKey;
  objective: TextKey;
  briefing: TextKey;
  routeHint: TextKey;
  cargo: CargoKind;
  mass: number;
  fragility: number;
  pickup: Point;
  spawn: Point;
  bay: "A" | "B";
  target: { x: number; z: number; width: number; depth: number };
  racks: readonly Point[];
  barriers: readonly Point[];
  crates: readonly Point[];
  pallets: readonly Point[];
  cones: readonly Point[];
  tint: string;
}
const racks: Point[] = [-13, 13]
  .flatMap((x) => [-10, 0, 10].map((z) => [x, z] as const))
  .concat([
    [-3, 4],
    [3, 4],
  ]);
const barriers: Point[] = [
  [-5, -9],
  [5, -1],
  [-8, 13],
  [14, 17],
];
const crates: Point[] = [
  [-10, -16],
  [-9, -16],
  [11, -5],
  [11, 3],
  [-7, 9],
];
const pallets: Point[] = [
  [4, 9],
  [-7, -1],
  [11, -13],
];
const cones: Point[] = [
  [6, -9],
  [-6, -1],
  [10, 13],
];
const mirror = (points: readonly Point[]): Point[] =>
  points.map(([x, z]) => [-x, z]);
export const levels: readonly MissionDefinition[] = [
  {
    id: "piano-b",
    title: "Deliver the piano to Loading Bay B.",
    heading: "heading",
    objective: "missionPiano",
    briefing: "briefPiano",
    routeHint: "hintAisle",
    cargo: "piano",
    mass: 240,
    fragility: 1,
    pickup: [0, -5],
    spawn: [0, -11],
    bay: "B",
    target: { x: 8, z: 15, width: 6, depth: 5 },
    racks,
    barriers,
    crates,
    pallets,
    cones,
    tint: "#77d9bc",
  },
  {
    id: "ceramics-a",
    title: "Deliver the ceramics to Loading Bay A.",
    heading: "headingCeramics",
    objective: "missionCeramics",
    briefing: "briefCeramics",
    routeHint: "hintLeftAisle",
    cargo: "ceramics",
    mass: 180,
    fragility: 1.8,
    pickup: [0, -5],
    spawn: [0, -11],
    bay: "A",
    target: { x: -8, z: 15, width: 5.6, depth: 5 },
    racks: mirror(racks),
    barriers: mirror(barriers),
    crates: mirror(crates),
    pallets: mirror(pallets),
    cones: [...mirror(cones), [-10, 11], [-5.5, 11]],
    tint: "#86c8c1",
  },
  {
    id: "generator-b",
    title: "Deliver the generator to Loading Bay B.",
    heading: "headingGenerator",
    objective: "missionGenerator",
    briefing: "briefGenerator",
    routeHint: "hintCrossAisle",
    cargo: "generator",
    mass: 540,
    fragility: 0.65,
    pickup: [-8, -5],
    spawn: [-8, -11],
    bay: "B",
    target: { x: 8, z: 15, width: 5.6, depth: 5 },
    racks: [...racks, [-8, 9]],
    barriers: [
      [-3, -9],
      [0, 0],
      [-8, 13],
      [14, 17],
    ],
    crates: [
      [-14, -16],
      [11, -5],
      [11, 3],
      [-5, 14],
    ],
    pallets: [
      [4, 9],
      [11, -13],
    ],
    cones: [
      [-5, -3],
      [4, -7],
      [10, 13],
    ],
    tint: "#a2c9a0",
  },
];
export const firstMission = levels[0];
export function resolveLevel(id: string | null | undefined): MissionDefinition {
  return levels.find((level) => level.id === id) ?? firstMission;
}
