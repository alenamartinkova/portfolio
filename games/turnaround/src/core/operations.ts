import definitions from "./tasks.json";
export type VehicleId =
  "crew" | "stairs" | "belt" | "tug" | "fuel" | "catering" | "water" | "push";
export type Phase =
  | "approach"
  | "rollout"
  | "taxi"
  | "service"
  | "pushback"
  | "taxiout"
  | "takeoff"
  | "complete";
export interface Pose {
  x: number;
  z: number;
  heading: number;
  speed: number;
  height: number;
}
export interface Task {
  id: string;
  vehicle: VehicleId | "auto";
  at: number[];
  heading?: number;
  height?: number;
  duration: number;
  requires: string[];
  blockers?: string[];
  flight?: number;
  group: string;
}
export interface TaskState {
  status: "waiting" | "running" | "done";
  elapsed: number;
  finished?: number;
}
export interface FlightState {
  version: 1;
  flight: 1 | 2;
  phase: Phase;
  time: number;
  penalties: number;
  damage: number;
  violations: number;
  softLanding: boolean;
  assistedLand: boolean;
  assistedTakeoff: boolean;
  bagMistakes: number;
  tasks: Record<string, TaskState>;
  attached: Partial<Record<VehicleId, string>>;
  checkpoints: number[];
  plane: Pose & {
    y: number;
    vertical: number;
    pitch: number;
    roll: number;
    throttle: number;
  };
  message: string;
  messageUntil: number;
  cooldown: number;
  pushConnected: boolean;
}
export const VEHICLES: {
  id: VehicleId;
  at: number[];
  heading: number;
  height: number;
  mass: number;
  speed: number;
  turn: number;
}[] = [
  {
    id: "crew",
    at: [5.8, -2.1],
    heading: Math.atan2(-40, 52),
    height: 0,
    mass: 80,
    speed: 3.5,
    turn: 2.8,
  },
  {
    id: "stairs",
    at: [-17, -4.8],
    heading: Math.PI / 2,
    height: 1.4,
    mass: 800,
    speed: 4.8,
    turn: 0.65,
  },
  {
    id: "belt",
    at: [-17, 5],
    heading: Math.PI / 2,
    height: 1.1,
    mass: 1000,
    speed: 4.5,
    turn: 0.6,
  },
  {
    id: "tug",
    at: [-24, 9],
    heading: 0,
    height: 0,
    mass: 1500,
    speed: 6,
    turn: 0.65,
  },
  {
    id: "fuel",
    at: [19, 0],
    heading: -Math.PI / 2,
    height: 0,
    mass: 6500,
    speed: 4.2,
    turn: 0.28,
  },
  {
    id: "catering",
    at: [18, -4.8],
    heading: -Math.PI / 2,
    height: 1.2,
    mass: 3800,
    speed: 4.5,
    turn: 0.4,
  },
  {
    id: "water",
    at: [18, 6],
    heading: -Math.PI / 2,
    height: 0,
    mass: 2600,
    speed: 4.8,
    turn: 0.5,
  },
  {
    id: "push",
    at: [12, 22],
    heading: 0,
    height: 0,
    mass: 5000,
    speed: 3,
    turn: 0.35,
  },
];
const flightTasks = [
  [],
  definitions.filter((t) => !t.flight),
  definitions,
] as Task[][];
export const tasksFor = (flight: number): Task[] =>
  flightTasks[flight] ?? flightTasks[1];
export const angleDifference = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const distance = (a: Pick<Pose, "x" | "z">, at: number[]) =>
  Math.hypot(a.x - at[0], a.z - at[1]);
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const formatTime = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}`;
export function createFlight(
  flight: 1 | 2,
  assistedLand = true,
  assistedTakeoff = true,
): FlightState {
  return {
    version: 1,
    flight,
    phase: "approach",
    time: 0,
    penalties: 0,
    damage: 0,
    violations: 0,
    bagMistakes: 0,
    softLanding: false,
    assistedLand,
    assistedTakeoff,
    attached: {},
    checkpoints: [],
    tasks: Object.fromEntries(
      tasksFor(flight).map((t) => [t.id, { status: "waiting", elapsed: 0 }]),
    ),
    plane: {
      x: -64,
      z: 1500,
      y: 74,
      vertical: -3,
      speed: 58,
      height: 0,
      heading: 0,
      pitch: -0.052,
      roll: 0,
      throttle: 0.5,
    },
    message: "welcome",
    messageUntil: 8,
    cooldown: 0,
    pushConnected: false,
  };
}
export const done = (s: FlightState, id: string) =>
  !s.tasks[id] || s.tasks[id].status === "done";
export const available = (s: FlightState, t: Task) =>
  s.tasks[t.id]?.status === "waiting" &&
  t.requires.every((id) => done(s, id)) &&
  !(t.blockers ?? []).some((id) => s.tasks[id]?.status === "running");
export function say(s: FlightState, message: string) {
  s.message = message;
  s.messageUntil = s.time + 7;
}
export function penalize(
  s: FlightState,
  message: string,
  seconds = 15,
  damage = false,
) {
  if (s.time < s.cooldown) return;
  s.penalties += seconds;
  if (damage) s.damage++;
  else s.violations++;
  s.cooldown = s.time + 3;
  say(s, message);
}
export function dockQuality(t: Task, p: Pose): "perfect" | "close" | "far" {
  const d = distance(p, t.at),
    angle =
      t.heading === undefined
        ? 0
        : Math.abs(angleDifference(p.heading, t.heading));
  const height = t.height === undefined ? 0 : Math.abs(p.height - t.height);
  if (
    d <= (t.vehicle === "crew" ? 1.8 : 0.75) &&
    angle < 0.22 &&
    height <= 0.3 &&
    Math.abs(p.speed) < 0.4
  )
    return "perfect";
  return d < 3.5 ? "close" : "far";
}
export function taskFor(s: FlightState, vehicle: VehicleId): Task | undefined {
  const tasks = tasksFor(s.flight).filter(
    (t) => t.vehicle === vehicle && s.tasks[t.id].status !== "done",
  );
  return (
    tasks.find((t) => s.tasks[t.id].status === "running") ??
    tasks.find((t) => available(s, t)) ??
    tasks[0]
  );
}
export function interactTask(s: FlightState, t: Task, p: Pose): boolean {
  if (s.phase !== "service" || s.tasks[t.id]?.status !== "waiting")
    return false;
  if (dockQuality(t, p) !== "perfect") {
    say(s, "align");
    return false;
  }
  if (!available(s, t)) {
    if (t.id === "removeGpu" && !done(s, "apu")) penalize(s, "gpuRule");
    else if (
      (t.id === "board" && !done(s, "fuel")) ||
      (t.id === "fuel" && s.tasks.board?.status === "running")
    )
      penalize(s, "fuelRule");
    else if (t.id === "removeChocks") penalize(s, "chockRule");
    else say(s, "dependencies");
    return false;
  }
  s.tasks[t.id].status = "running";
  if (["stairs", "unload", "fuel", "catering", "water"].includes(t.id))
    s.attached[t.vehicle as VehicleId] = t.id;
  say(s, "connected");
  return true;
}
export function release(s: FlightState, vehicle: VehicleId) {
  const task = s.attached[vehicle];
  if (!task) return true;
  if (
    !done(s, task) ||
    (vehicle === "stairs" && !done(s, "removeStairs")) ||
    (vehicle === "belt" && !done(s, "load"))
  ) {
    say(s, "busy");
    return false;
  }
  delete s.attached[vehicle];
  say(s, "disconnected");
  return true;
}
export function tickTasks(
  s: FlightState,
  dt: number,
  poses: Record<VehicleId, Pose>,
  completedAt = s.time,
) {
  let changed = false;
  for (const t of tasksFor(s.flight)) {
    const state = s.tasks[t.id];
    if (t.vehicle === "auto" && available(s, t)) {
      state.status = "running";
      changed = true;
    }
    if (state.status !== "running") continue;
    // A connected service runs in parallel, while handling bags/inspection needs the vehicle to remain parked.
    if (t.vehicle !== "auto" && dockQuality(t, poses[t.vehicle]) !== "perfect")
      continue;
    state.elapsed = Math.min(t.duration, state.elapsed + dt);
    if (state.elapsed < t.duration - 1e-6) continue;
    state.status = "done";
    state.finished = completedAt;
    changed = true;
    say(s, `done:${t.id}`);
    if (t.id === "removeStairs") delete s.attached.stairs;
  }
  return changed;
}
export function serviceComplete(
  s: FlightState,
  poses: Record<VehicleId, Pose>,
) {
  return (
    Object.values(s.tasks).every((t) => t.status === "done") &&
    Object.keys(s.attached).length === 0 &&
    VEHICLES.filter(
      (v) =>
        v.id !== "crew" &&
        v.id !== "push" &&
        (s.flight === 2 || !["fuel", "water", "catering"].includes(v.id)),
    ).every((v) => Math.abs(poses[v.id].x) > 12 || Math.abs(poses[v.id].z) > 15)
  );
}
export function stepClock(s: FlightState, dt: number) {
  if (s.phase !== "complete") s.time += dt;
}
export interface FlightInput {
  throttle: number;
  steer: number;
  pitch: number;
  brake: boolean;
  reverse: boolean;
}
const landingReset = (s: FlightState) => {
  penalize(s, "goAround", 30, true);
  Object.assign(s.plane, {
    x: -64,
    z: 1500,
    y: 74,
    vertical: -3,
    speed: 58,
    pitch: -0.052,
    roll: 0,
    heading: 0,
  });
};
export function stepPlane(s: FlightState, dt: number, input: FlightInput) {
  const p = s.plane;
  if (s.phase === "approach") {
    if (s.assistedLand) {
      p.throttle = 0.5;
      p.pitch = -0.052;
      p.x += (-64 - p.x) * dt * 2;
      p.y = Math.max(0, (p.z - 80) * 0.052);
      p.vertical = -3;
    } else {
      p.throttle = clamp(p.throttle + input.throttle * dt * 0.35, 0, 1);
      p.pitch = clamp(p.pitch + input.pitch * dt * 0.065, -0.18, 0.18);
      p.roll += (input.steer * 0.35 - p.roll) * dt * 3;
      p.x += p.roll * p.speed * dt * 0.35;
      // Arcade lift/drag: low speed loses lift; pitch controls the flight path.
      p.vertical +=
        (p.speed * Math.sin(p.pitch) +
          ((p.speed * p.speed) / (58 * 58) - 1) * 9.81 -
          p.vertical) *
        dt *
        2;
      p.y += p.vertical * dt;
    }
    p.speed = clamp(
      p.speed + ((p.throttle - 0.5) * 12 - (p.speed - 58) * 0.12) * dt,
      22,
      92,
    );
    p.z -= p.speed * dt;
    if (p.y <= 0) {
      if (
        Math.abs(p.x + 64) > 9 ||
        p.z < -100 ||
        p.z > 350 ||
        p.speed < 38 ||
        p.vertical < -7
      ) {
        landingReset(s);
        return;
      }
      s.softLanding =
        !s.assistedLand &&
        Math.abs(p.vertical) < 3.5 &&
        Math.abs(p.x + 64) < 2.5 &&
        p.z >= 0 &&
        p.z <= 220;
      if (p.vertical < -4) penalize(s, "hardLanding", 30, true);
      p.y = 0;
      p.pitch = p.roll = 0;
      s.phase = "rollout";
      say(s, "brakes");
    } else if (p.z < -150 || p.y > 220) landingReset(s);
  } else if (s.phase === "rollout") {
    p.speed = Math.max(
      0,
      p.speed -
        dt * (s.assistedLand || input.brake ? 11 : input.reverse ? 7 : 1.2),
    );
    p.z -= p.speed * dt;
    if (p.speed < 0.5) {
      if (p.z < -180) {
        s.penalties += 20;
        say(s, "missedExit");
      }
      p.z = 40;
      p.x = -64;
      p.heading = Math.PI / 2;
      s.phase = "taxi";
      s.checkpoints = [];
      say(s, "taxi");
    }
  } else if (s.phase === "taxi" || s.phase === "taxiout") {
    p.speed +=
      ((input.brake ? 0 : input.throttle * 7) - p.speed) *
      dt *
      (input.brake ? 5 : 1.3);
    p.heading += input.steer * p.speed * 0.09 * dt;
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z -= Math.cos(p.heading) * p.speed * dt;
    p.x = clamp(p.x, -82, 40);
    p.z = clamp(p.z, -22, 75);
    const route =
      s.phase === "taxi"
        ? [
            [-38, 40],
            [0, 34],
            [0, 0],
          ]
        : [
            [0, 34],
            [-38, 40],
            [-64, 40],
          ];
    const index = s.checkpoints.length;
    if (
      index < route.length &&
      distance(p, route[index]) < (index === 2 ? 2 : 9)
    ) {
      if (index < 2) {
        s.checkpoints.push(index);
        say(s, "taxi");
      } else if (
        Math.abs(p.speed) < 0.5 &&
        Math.abs(angleDifference(p.heading, 0)) < 0.3
      ) {
        p.speed = 0;
        p.heading = 0;
        p.x = route[2][0];
        p.z = route[2][1];
        s.phase = s.phase === "taxi" ? "service" : "takeoff";
        say(s, s.phase === "service" ? "secure" : "rotate");
      }
    }
  } else if (s.phase === "pushback" && s.pushConnected) {
    p.speed += ((input.brake ? 0 : input.throttle * 2.8) - p.speed) * dt * 2;
    p.heading -= input.steer * p.speed * 0.06 * dt;
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z -= Math.cos(p.heading) * p.speed * dt;
    p.x = clamp(p.x, -12, 12);
    p.z = clamp(p.z, 0, 36);
  } else if (s.phase === "takeoff") {
    const auto = s.assistedTakeoff;
    p.throttle = clamp(
      p.throttle + (auto ? 1 : input.throttle) * dt * 0.5,
      0,
      1,
    );
    p.speed = Math.max(
      0,
      p.speed +
        (p.throttle * 4.2 - p.speed * 0.014 - (input.brake ? 7 : 0)) * dt,
    );
    p.x += (auto ? (-64 - p.x) * 2 : input.steer * p.speed * 0.035) * dt;
    p.z -= p.speed * dt;
    if (Math.abs(p.x + 64) > 10 || (p.z < -1150 && p.y < 2)) {
      penalize(s, "runway", 30, true);
      Object.assign(p, { x: -64, z: 40, speed: 0, y: 0, pitch: 0 });
    }
    if (auto ? p.speed >= 52 : input.pitch > 0) {
      if (p.speed < 45) penalize(s, "tailStrike", 30, true);
      else {
        p.pitch = 0.12;
        p.y += dt * (p.speed - 38) * 0.3;
      }
    }
    if (p.y > 20) {
      s.phase = "complete";
      say(s, "airborne");
    }
  }
}
export const score = (s: FlightState) => ({
  seconds: s.time + s.penalties,
  stars: [
    s.damage === 0,
    s.violations === 0,
    s.bagMistakes === 0,
    s.softLanding && !s.assistedTakeoff,
  ],
});
export const recordKey = (s: FlightState) =>
  `${s.flight}:${s.assistedLand ? "auto" : "manual"}:${s.assistedTakeoff ? "auto" : "manual"}`;
export interface RecordEntry {
  seconds: number;
  stars: boolean[];
  tasks: Record<string, number>;
}
export function bestRecord(
  previous: RecordEntry | undefined,
  s: FlightState,
): RecordEntry | undefined {
  if (s.phase !== "complete") return previous;
  const result = score(s);
  if (previous && previous.seconds <= result.seconds) return previous;
  return {
    ...result,
    tasks: Object.fromEntries(
      Object.entries(s.tasks).map(([id, t]) => [id, t.finished ?? 0]),
    ),
  };
}
