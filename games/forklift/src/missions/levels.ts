import type { TextKey } from "../i18n";
export type Point = readonly [number, number];
export type CargoKind = "piano" | "ceramics" | "generator" | "parcels";
export type Atmosphere = "day" | "night" | "cold" | "sunset";
export interface DeliveryTarget {
  x: number; z: number; width: number; depth: number;
  /** Top of the physical supporting surface; omitted for floor deliveries. */
  height?: number;
  rack?: string;
}
export interface MissionDefinition {
  id: string;
  name: TextKey;
  par: number;
  inspections: readonly Point[];
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
  target: DeliveryTarget;
  atmosphere?: Atmosphere;
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
const introductoryLevels: readonly MissionDefinition[] = [
  {
    id: "piano-b", name: "nameTraining", par: 150, inspections: [],
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
    id: "ceramics-a", name: "nameCeramics", par: 170, inspections: [],
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
    id: "generator-b", name: "nameHeavy", par: 190, inspections: [],
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
const perimeter: Point[] = [-13, 13].flatMap(x => [-12, -2, 9].map(z => [x, z] as const));
function advanced(
  id: string, name: TextKey, cargo: CargoKind, bay: "A" | "B", pickup: Point,
  inspections: Point[], center: Point[], rails: Point[], width: number, par: number,
): MissionDefinition {
  const base = introductoryLevels.find(level => level.cargo === cargo)!;
  return {
    ...base, id, name, heading: name, cargo, bay, pickup,
    spawn: [pickup[0], pickup[1] - 6], inspections, par,
    title: `${cargo} / Bay ${bay}`,
    target: { x: bay === "A" ? -8 : 8, z: 15, width, depth: width },
    racks: [...perimeter, ...center], barriers: rails,
    crates: [[-15, -17], [15, -17], [-15, 16], [15, 15]],
    pallets: [[-15, 3], [15, 3]], cones: [[-3, -17], [3, 17]],
  };
}
export const levels: readonly MissionDefinition[] = [
  ...introductoryLevels,
  advanced("quality-control", "nameInspection", "piano", "B", [0, -10], [[8, 4]], [[0, 1]], [[-5, 8], [3, -3]], 5.6, 210),
  advanced("ceramic-slalom", "nameSlalom", "ceramics", "A", [8, -10], [[0, -3], [-8, 6]], [[0, 4]], [[-4, -7], [5, 8], [0, 11]], 5.2, 240),
  advanced("heavy-detour", "nameDetour", "generator", "A", [0, -10], [[8, 0], [0, 9]], [[-4, 1], [4, 4]], [[-8, -4], [4, 11]], 5.2, 250),
  advanced("concert-tour", "nameConcert", "piano", "B", [-8, -10], [[-8, 4], [8, 9]], [[0, -2], [0, 5]], [[4, -7], [-3, 12]], 4.9, 270),
  advanced("precision-glass", "namePrecision", "ceramics", "B", [0, -10], [[-8, 0], [0, 9]], [[3, 0], [-3, 4]], [[8, -4], [-8, 11]], 4.6, 280),
  advanced("double-audit", "nameAudit", "generator", "B", [8, -10], [[0, -3], [-8, 5], [8, 10]], [[0, 3]], [[-4, -7], [5, 6], [-4, 11]], 4.8, 300),
  advanced("master-certification", "nameMaster", "ceramics", "A", [0, -10], [[8, -2], [-8, 5], [0, 10]], [[0, 3]], [[-5, -6], [5, 7], [-4, 12]], 4.6, 320),
  {
    ...advanced("night-shift", "nameNight", "piano", "B", [8, -7], [], [[-4, -7], [-4, 0], [-4, 7], [4, 3]], [[0, -3]], 5.4, 220),
    cargo: "parcels", mass: 210, fragility: 1.1, atmosphere: "night",
    objective: "missionNight", briefing: "briefNight", routeHint: "hintNight",
    crates: [[-15, -17], [-14, -15], [-2, 12], [0, 13], [2, 12], [-8, 13], [-7, 15], [15, 15]],
  },
  {
    ...advanced("shelf-service", "nameShelf", "piano", "B", [0, -7], [], [[-6, -2], [6, -2], [-6, 8], [6, 8]], [[-10, 4], [10, 4]], 5.2, 230),
    cargo: "parcels", mass: 210, fragility: 1.1,
    objective: "missionShelf", briefing: "briefShelf", routeHint: "hintShelfRoute",
    target: { x: 0, z: 14, width: 5.2, depth: 4, height: 1.35, rack: "R-03" },
  },
  {
    ...advanced("cold-storage", "nameCold", "ceramics", "A", [-8, -7], [[-8, 3]], [[0, -7], [0, 0], [0, 7]], [[5, -3], [5, 11]], 5.2, 260),
    atmosphere: "cold", objective: "missionCold", briefing: "briefCold", routeHint: "hintCold",
    target: { x: -8, z: 14, width: 5.2, depth: 4.6, height: 1.65, rack: "C-02" },
  },
  {
    ...advanced("last-dispatch", "nameSunset", "generator", "B", [8, -7], [[8, 3]], [[-7, 0], [-7, 9]], [[0, -6], [0, 6]], 4.8, 200),
    atmosphere: "sunset", objective: "missionSunset", briefing: "briefSunset", routeHint: "hintSunset",
    crates: [[-14, -16], [-12, -16], [-10, -16], [-14, -14], [-12, -14], [-14, 15]],
  },
];
export const firstMission = levels[0];
export function resolveLevel(id: string | null | undefined): MissionDefinition {
  return levels.find((level) => level.id === id) ?? firstMission;
}
