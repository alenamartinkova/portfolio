import { describe, expect, it } from "vitest";
import {
  VEHICLES,
  available,
  bestRecord,
  createFlight,
  dockQuality,
  interactTask,
  recordKey,
  release,
  score,
  serviceComplete,
  stepPlane,
  taskFor,
  tasksFor,
  tickTasks,
  type FlightState,
  type Pose,
  type Task,
  type VehicleId,
} from "../src/core/operations";
import { Progress } from "../src/progress";
const poses = () =>
  Object.fromEntries(
    VEHICLES.map((v) => [
      v.id,
      {
        x: v.at[0],
        z: v.at[1],
        heading: v.heading,
        speed: 0,
        height: v.height,
      },
    ]),
  ) as Record<VehicleId, Pose>;
const dock = (t: Task): Pose => ({
  x: t.at[0],
  z: t.at[1],
  heading: t.heading ?? 0,
  height: t.height ?? 0,
  speed: 0,
});
const task = (id: string) => tasksFor(2).find((t) => t.id === id)!;
const idleInput = {
  throttle: 0,
  steer: 0,
  pitch: 0,
  brake: false,
  reverse: false,
};
function advance(s: FlightState, p: Record<VehicleId, Pose>, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) {
    s.time += 1 / 120;
    tickTasks(s, 1 / 120, p);
  }
}
describe("operations and actual dependency outcomes", () => {
  it("coalesced service ticks preserve the ghost timestamps and automatic passenger dependencies", () => {
    const setup = () => {
      const s = createFlight(2),
        p = poses();
      s.phase = "service";
      s.tasks.secure.status = "done";
      p.stairs = dock(task("stairs"));
      interactTask(s, task("stairs"), p.stairs);
      return { s, p };
    };
    const continuous = setup(),
      sleeping = setup();
    advance(continuous.s, continuous.p, 35);
    // The UI clock can advance once per second while fixed task ticks retain their own completion time.
    for (let second = 1; second <= 35; second++) {
      sleeping.s.time = second;
      for (let step = 1; step <= 120; step++)
        tickTasks(sleeping.s, 1 / 120, sleeping.p, second - 1 + step / 120);
    }
    for (const id of ["stairs", "deplane"]) {
      expect(sleeping.s.tasks[id].status).toBe("done");
      expect(sleeping.s.tasks[id].finished).toBeCloseTo(
        continuous.s.tasks[id].finished!,
        6,
      );
      expect(sleeping.s.tasks[id].elapsed).toBeCloseTo(
        continuous.s.tasks[id].elapsed,
        6,
      );
    }
  });
  it("cannot dock at speed, with the wrong height or wrong heading", () => {
    const t = task("stairs"),
      p = dock(t);
    expect(dockQuality(t, p)).toBe("perfect");
    for (const wrong of [
      { speed: 2 },
      { height: 1 },
      { heading: 0 },
      { x: -7 },
    ])
      expect(dockQuality(t, { ...p, ...wrong })).not.toBe("perfect");
  });
  it("locks equipment before chocks, then allows independent services to progress together", () => {
    const s = createFlight(2),
      p = poses();
    s.phase = "service";
    expect(interactTask(s, task("stairs"), dock(task("stairs")))).toBe(false);
    p.crew = dock(task("secure"));
    expect(interactTask(s, task("secure"), p.crew)).toBe(true);
    advance(s, p, 4);
    for (const id of ["stairs", "fuel", "unload"]) {
      const t = task(id);
      p[t.vehicle as VehicleId] = dock(t);
      expect(interactTask(s, t, dock(t))).toBe(true);
    }
    advance(s, p, 12);
    expect(s.tasks.deplane.elapsed).toBeGreaterThan(8);
    expect(s.tasks.fuel.elapsed).toBeGreaterThan(11);
    expect(s.tasks.unload.elapsed).toBeGreaterThan(11);
    expect(release(s, "fuel")).toBe(false);
  });
  it("enforces fueling, APU and chock rules and never makes a blocked task runnable", () => {
    const s = createFlight(2);
    s.phase = "service";
    for (const [id, message] of [
      ["removeGpu", "gpuRule"],
      ["removeChocks", "chockRule"],
      ["board", "fuelRule"],
    ]) {
      s.time += 4;
      expect(interactTask(s, task(id), dock(task(id)))).toBe(false);
      expect(s.message).toBe(message);
      expect(s.tasks[id].status).toBe("waiting");
    }
    expect(s.penalties).toBe(45);
    expect(s.violations).toBe(3);
  });
  for (const flight of [1, 2] as const)
    it(`flight ${flight}: complete DAG, preserve timings through serialization, require clearing equipment`, () => {
      let s = createFlight(flight);
      const p = poses();
      s.phase = "service";
      let turns = 0;
      while (
        Object.values(s.tasks).some((t) => t.status !== "done") &&
        turns++ < 40
      ) {
        const t = tasksFor(flight).find(
          (t) => t.vehicle !== "auto" && available(s, t),
        );
        if (t) {
          p[t.vehicle as VehicleId] = dock(t);
          expect(interactTask(s, t, p[t.vehicle as VehicleId])).toBe(true);
        }
        advance(s, p, 40);
        s = JSON.parse(JSON.stringify(s));
      }
      expect(turns).toBeLessThan(40);
      expect(Object.values(s.tasks).every((t) => t.status === "done")).toBe(
        true,
      );
      expect(serviceComplete(s, p)).toBe(false);
      for (const v of VEHICLES) {
        release(s, v.id);
        p[v.id] = { ...p[v.id], x: v.at[0], z: v.at[1] };
      }
      expect(serviceComplete(s, p)).toBe(true);
      expect(s.tasks.board.finished!).toBeGreaterThan(s.tasks.load.finished!);
      expect(s.tasks.removeGpu.finished!).toBeGreaterThan(
        s.tasks.apu.finished!,
      );
      if (flight === 2)
        expect(s.tasks.board.finished!).toBeGreaterThan(s.tasks.fuel.finished!);
      expect(s.penalties).toBe(0);
    });
  it("unfinished bag transfer waits when the tug leaves the dock", () => {
    const s = createFlight(1),
      p = poses();
    s.phase = "service";
    s.tasks.unload.status = "done";
    p.tug = dock(task("pickup"));
    interactTask(s, task("pickup"), p.tug);
    p.tug.x = -30;
    advance(s, p, 5);
    expect(s.tasks.pickup.elapsed).toBe(0);
    expect(taskFor(s, "tug")?.id).toBe("pickup");
  });
});
describe("flight transitions and scoring", () => {
  it("auto landing reaches taxi without awarding a manual flight star", () => {
    const s = createFlight(1);
    for (let i = 0; i < 60 * 120 && s.phase !== "taxi"; i++)
      stepPlane(s, 1 / 120, idleInput);
    expect(s.phase).toBe("taxi");
    expect(s.damage).toBe(0);
    expect(s.softLanding).toBe(false);
  });
  it("manual stable approach lands, off-runway touchdown goes around", () => {
    const s = createFlight(1, false, false);
    for (let i = 0; i < 45 * 120 && s.phase === "approach"; i++)
      stepPlane(s, 1 / 120, idleInput);
    expect(s.phase).toBe("rollout");
    expect(s.softLanding).toBe(true);
    const bad = createFlight(1, false);
    Object.assign(bad.plane, { x: -30, y: -0.1 });
    stepPlane(bad, 1 / 120, idleInput);
    expect(bad.phase).toBe("approach");
    expect(bad.plane.y).toBe(74);
    expect(bad.damage).toBe(1);
  });
  it("taxi requires ordered waypoints, a full stop, and the correct heading", () => {
    const s = createFlight(1);
    s.phase = "taxi";
    Object.assign(s.plane, { x: 0, z: 0, y: 0, speed: 0 });
    stepPlane(s, 0.01, idleInput);
    expect(s.phase).toBe("taxi");
    s.checkpoints = [0, 1];
    s.plane.heading = Math.PI;
    stepPlane(s, 0.01, idleInput);
    expect(s.phase).toBe("taxi");
    s.plane.heading = 0;
    stepPlane(s, 0.01, idleInput);
    expect(s.phase).toBe("service");
  });
  it("both authored taxi routes are drivable with ordinary throttle, steering and braking inputs", () => {
    const s = createFlight(1);
    s.phase = "taxi";
    Object.assign(s.plane, {
      x: -64,
      z: 40,
      y: 0,
      speed: 0,
      heading: Math.PI / 2,
    });
    const driveUntil = (
      predicate: () => boolean,
      input: Partial<typeof idleInput>,
      limit = 45,
    ) => {
      let count = 0;
      while (!predicate() && count++ < limit * 120)
        stepPlane(s, 1 / 120, { ...idleInput, ...input });
      expect(predicate()).toBe(true);
    };
    driveUntil(() => s.plane.x >= -11.1, { throttle: 1 });
    driveUntil(() => s.plane.heading <= 0, { throttle: 1, steer: -1 });
    driveUntil(() => s.plane.z <= 2.6, { throttle: 1 });
    driveUntil(() => (s as FlightState).phase === "service", { brake: true });
    s.phase = "pushback";
    s.pushConnected = true;
    driveUntil(() => s.plane.z >= 26, { throttle: -1 });
    driveUntil(() => Math.abs(s.plane.speed) < 0.1, { brake: true });
    s.phase = "taxiout";
    s.pushConnected = false;
    s.checkpoints = [];
    driveUntil(() => s.plane.heading <= -Math.PI / 2, {
      throttle: -1,
      steer: 1,
    });
    driveUntil(() => s.plane.x <= -52.8, { throttle: 1 });
    driveUntil(() => s.plane.heading >= 0, { throttle: 1, steer: 1 });
    driveUntil(() => Math.abs(s.plane.speed) < 0.1, { brake: true });
    driveUntil(() => s.plane.z >= 37.4, { throttle: -1 });
    driveUntil(() => (s as FlightState).phase === "takeoff", { brake: true });
  });
  it("auto and manual departures complete, with early rotation penalized", () => {
    for (const auto of [true, false]) {
      const s = createFlight(1, false, auto);
      s.phase = "takeoff";
      Object.assign(s.plane, { x: -64, z: 40, y: 0, speed: 0, pitch: 0 });
      for (
        let i = 0;
        i < 50 * 120 && (s as FlightState).phase !== "complete";
        i++
      ) {
        s.time += 1 / 120;
        stepPlane(s, 1 / 120, {
          ...idleInput,
          throttle: 1,
          pitch: s.plane.speed >= 52 ? 1 : 0,
        });
      }
      expect(s.phase).toBe("complete");
      expect(s.damage).toBe(0);
    }
    const s = createFlight(1, false, false);
    s.phase = "takeoff";
    s.plane.speed = 20;
    s.plane.y = 0;
    stepPlane(s, 1 / 120, { ...idleInput, pitch: 1 });
    expect(s.damage).toBe(1);
  });
  it("preserves fastest ghost per flight and assist setting and rejects incomplete records", () => {
    const s = createFlight(1);
    expect(bestRecord(undefined, s)).toBeUndefined();
    s.phase = "complete";
    s.time = 300;
    s.penalties = 15;
    s.tasks.secure.finished = 12;
    const record = bestRecord(undefined, s)!;
    expect(record.seconds).toBe(315);
    expect(record.tasks.secure).toBe(12);
    s.time = 400;
    expect(bestRecord(record, s)).toBe(record);
    expect(recordKey(s)).not.toBe(recordKey(createFlight(1, false)));
    expect(score(s).stars[3]).toBe(false);
  });
  it("handles blocked/corrupt persistence without breaking the session", () => {
    for (const raw of ["null", "[]", "{bad", '{"1:auto:auto":{"seconds":-1}}'])
      expect(
        new Progress({ getItem: () => raw, setItem: () => {} }).get(
          createFlight(1),
        ),
      ).toBeUndefined();
    const progress = new Progress({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    const s = createFlight(2);
    s.phase = "complete";
    s.time = 300;
    expect(progress.save(s)).toBe(true);
    expect(progress.get(s)?.seconds).toBe(300);
  });
});
