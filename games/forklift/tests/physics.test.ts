import {
  levels,
  firstMission,
  type MissionDefinition,
} from "../src/missions/levels";
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import HavokPhysics from "@babylonjs/havok";
import {
  HavokPlugin,
  MeshBuilder,
  NullEngine,
  Scene,
  Vector3,
} from "@babylonjs/core";
import { Factory } from "../src/world/Factory";
import { Cargo } from "../src/world/Cargo";
import { Warehouse } from "../src/world/Warehouse";
import { MissionManager } from "../src/systems/MissionManager";
import { DamageSystem } from "../src/systems/DamageSystem";
import { FollowCamera } from "../src/player/FollowCamera";
import { ForkliftController } from "../src/player/ForkliftController";
import { rigid } from "../src/systems/Physics";
import type { Input } from "../src/systems/Input";
let havok: Awaited<ReturnType<typeof HavokPhysics>>;
beforeAll(async () => {
  havok = await HavokPhysics({
    wasmBinary: Uint8Array.from(
      readFileSync(
        new URL(
          "../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm",
          import.meta.url,
        ),
      ),
    ).buffer,
  });
});
// Skip only canvas text rendering. All real collision shapes and control code are exercised.
class HeadlessFactory extends Factory {
  override label(text: string | (() => string)) {
    return MeshBuilder.CreatePlane(
      typeof text === "function" ? text() : text,
      { size: 0.01 },
      this.scene,
    );
  }
}
function rig(
  warehouseLevel = false,
  definition: MissionDefinition = firstMission,
) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const plugin = new HavokPlugin(true, havok);
  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  const f = new HeadlessFactory(scene);
  const warehouse = warehouseLevel
    ? new Warehouse(scene, f, definition)
    : undefined;
  if (!warehouse) rigid(f.box("floor", [40, 1, 60], [0, -0.5, 0], "#808080"));
  const truck = new ForkliftController(f, definition.spawn),
    cargo = new Cargo(f, definition);
  const mission = new MissionManager(cargo, truck, definition);
  const damage = new DamageSystem(
    plugin,
    cargo,
    warehouse?.property ?? [],
    truck.body,
    () => {},
  );
  const keys = new Set<string>();
  const input = {
    keys,
    lookX: 0,
    lookY: 0,
    axis: (p: string, n: string) => Number(keys.has(p)) - Number(keys.has(n)),
  } as Input;
  const step = (seconds: number, command: string[] = []) => {
    keys.clear();
    command.forEach((k) => keys.add(k));
    for (let i = 0; i < Math.round(seconds * 120); i++) {
      scene.incrementRenderId();
      truck.root.computeWorldMatrix(true);
      cargo.root.computeWorldMatrix(true);
      truck.update(1 / 120, input);
      damage.beforeStep([truck.body, truck.forkBody, cargo.body]);
      scene.getPhysicsEngine()!._step(1 / 120);
      damage.update(1 / 120);
      mission.update(1 / 120, command.length > 0);
    }
    keys.clear();
  };
  return {
    truck,
    cargo,
    scene,
    warehouse,
    input,
    step,
    mission,
    damage,
    dispose: () => {
      scene.dispose();
      engine.dispose();
    },
  };
}
describe("real Havok forklift mechanics", () => {
  it("starts at rest without self-collision and can reverse", () => {
    const r = rig();
    try {
      r.step(3);
      expect(r.truck.root.position.z).toBeCloseTo(-11, 1);
      expect(r.truck.root.position.y).toBeCloseTo(0.68, 1);
      r.step(1, ["KeyS"]);
      r.step(1, ["Space"]);
      expect(r.truck.root.position.z).toBeLessThan(-12);
      expect(r.cargo.root.position.z).toBeCloseTo(-5, 1);
    } finally {
      r.dispose();
    }
  });
  it("physically lifts, carries, lowers and releases the piano without attachment", () => {
    const r = rig();
    try {
      r.step(1);
      r.step(1.4, ["KeyW"]);
      r.step(1, ["Space"]);
      r.step(0.65, ["KeyE"]);
      r.step(0.6, ["KeyT"]);
      r.step(0.5);
      expect(r.cargo.root.position.y).toBeGreaterThan(0.3);
      expect(r.cargo.root.parent).toBeNull();
      r.step(2, ["KeyW"]);
      r.step(1, ["Space"]);
      expect(r.cargo.root.position.z).toBeGreaterThan(-1);
      expect(r.cargo.root.getDirection(Vector3.Up()).y).toBeGreaterThan(0.93);
      r.step(0.6, ["KeyG"]);
      r.step(0.9, ["KeyQ"]);
      r.step(2, ["KeyS"]);
      r.step(1, ["Space"]);
      r.step(2);
      expect(r.cargo.root.position.y).toBeLessThan(0.12);
      expect(r.cargo.root.getDirection(Vector3.Up()).y).toBeGreaterThan(0.95);
    } finally {
      r.dispose();
    }
  });
});

describe("warehouse mission integration", () => {
  it("completes the full piano run through real warehouse collisions", () => {
    const r = rig(true);
    try {
      r.step(2);
      const route: [number, string[]][] = [
        [1.4, ["KeyW"]],
        [1, ["Space"]],
        [0.65, ["KeyE"]],
        [0.6, ["KeyT"]],
        [0.5, []],
        [2, ["KeyW", "KeyD"]],
        [1, ["Space"]],
        [0.8, ["KeyW"]],
        [1, ["Space"]],
        [2, ["KeyW", "KeyA"]],
        [1, ["Space"]],
        [4.4, ["KeyW"]],
        [1, ["Space"]],
        [0.6, ["KeyG"]],
        [0.9, ["KeyQ"]],
        [0.5, []],
        [2.2, ["KeyS"]],
        [1, ["Space"]],
        [1.5, []],
      ];
      route.forEach(([time, keys]) => r.step(time, keys));
      expect(
        r.mission.delivered,
        JSON.stringify({
          piano: r.cargo.root.position,
          truck: r.truck.root.position,
          upright: r.cargo.root.getDirection(Vector3.Up()).y,
          integrity: r.damage.integrity,
          property: r.damage.propertyDamage,
          hint: r.mission.hint,
        }),
      ).toBe(true);
      expect(r.damage.integrity).toBeGreaterThan(95);
      expect(r.damage.propertyDamage).toBe(0);
    } finally {
      r.dispose();
    }
  });
  it("charges damage for driving a loaded forklift into the center rack", () => {
    const r = rig(true);
    try {
      r.step(2);
      r.step(1.4, ["KeyW"]);
      r.step(1, ["Space"]);
      r.step(0.65, ["KeyE"]);
      r.step(0.6, ["KeyT"]);
      r.step(7, ["KeyW"]);
      r.step(2, ["Space"]);
      expect(r.damage.propertyDamage).toBeGreaterThan(0);
      expect(r.damage.integrity).toBeLessThan(100);
      expect(Number.isFinite(r.truck.root.position.y)).toBe(true);
    } finally {
      r.dispose();
    }
  });
});

it("keeps the follow camera above the truck when backed against a wall", () => {
  const r = rig(true);
  try {
    r.step(2);
    r.step(6, ["KeyS"]);
    r.step(1, ["Space"]);
    const camera = new FollowCamera(
      r.scene,
      r.truck,
      r.warehouse!.cameraObstacles,
    );
    camera.update(1 / 60, r.input);
    expect(camera.camera.position.y).toBeGreaterThan(
      r.truck.root.position.y + 3.5,
    );
    expect(camera.camera.position.z).toBeGreaterThanOrEqual(-20);
  } finally {
    r.dispose();
  }
});

// These recorded keyboard runs belong to the original two warehouse layouts.
for (const level of levels.slice(1, 3)) {
  it(`delivers ${level.cargo} through its warehouse layout`, () => {
    const r = rig(true, level);
    try {
      r.step(2);
      const left = level.bay === "A";
      const route: [number, string[]][] = [
        [1.4, ["KeyW"]],
        [1, ["Space"]],
        [0.65, ["KeyE"]],
        [0.6, ["KeyT"]],
        [0.5, []],
        [2, ["KeyW", left ? "KeyA" : "KeyD"]],
        [1, ["Space"]],
        [level.cargo === "generator" ? 3.7 : 0.8, ["KeyW"]],
        [1, ["Space"]],
        [2, ["KeyW", left ? "KeyD" : "KeyA"]],
        [1, ["Space"]],
        [level.cargo === "generator" ? 4.2 : 4.55, ["KeyW"]],
        [1, ["Space"]],
        [0.6, ["KeyG"]],
        [0.9, ["KeyQ"]],
        [0.5, []],
        [2.2, ["KeyS"]],
        [1, ["Space"]],
        [1.5, []],
      ];
      route.forEach(([time, keys]) => r.step(time, keys));
      expect(
        r.mission.delivered,
        JSON.stringify({
          cargo: r.cargo.root.position,
          truck: r.truck.root.position,
          integrity: r.damage.integrity,
          property: r.damage.propertyDamage,
          hint: r.mission.hint,
        }),
      ).toBe(true);
      expect(r.cargo.root.parent).toBeNull();
      expect(r.damage.integrity).toBeGreaterThan(95);
      expect(r.damage.propertyDamage).toBe(0);
    } finally {
      r.dispose();
    }
  });
}

for (const level of levels.slice(3)) {
  it(`picks up ${level.id} in its real layout and requires inspection before delivery`, () => {
    const r = rig(true, level);
    try {
      r.step(2);
      r.step(1.4, ['KeyW']); r.step(1, ['Space']);
      r.step(.65, ['KeyE']); r.step(.6, ['KeyT']); r.step(.5);
      expect(r.cargo.root.position.y).toBeGreaterThan(.3);
      expect(r.mission.pickedUp).toBe(true);
      expect(r.mission.inspections.complete).toBe(level.inspections.length === 0);
      expect(r.mission.delivered).toBe(false);
      expect(r.damage.integrity).toBeGreaterThan(95);
      expect(r.damage.propertyDamage).toBe(0);
    } finally { r.dispose(); }
  });
}

it('completes quality control with a real loaded stop and precision delivery', () => {
  const r = rig(true, levels[3]);
  try {
    r.step(2);
    for (const [seconds, keys] of [
      [1.4, ['KeyW']], [1, ['Space']], [.65, ['KeyE']], [.6, ['KeyT']], [.5, []],
      [2, ['KeyW', 'KeyD']], [1, ['Space']], [.8, ['KeyW']], [1, ['Space']],
      [2, ['KeyW', 'KeyA']], [1, ['Space']],
    ] as [number, string[]][]) r.step(seconds, keys);
    const driveTo = (z: number) => {
      for (let i = 0; i < 500 && r.cargo.root.position.z < z; i++) r.step(.05, ['KeyW']);
      r.step(1, ['Space']);
    };
    driveTo(3.3);
    r.step(2.5, ['Space']);
    expect(r.mission.inspections.complete, JSON.stringify(r.cargo.root.position)).toBe(true);
    expect(r.mission.delivered).toBe(false);
    driveTo(14.2);
    r.step(.6, ['KeyG']); r.step(.9, ['KeyQ']); r.step(.5);
    r.step(2.2, ['KeyS']); r.step(1, ['Space']); r.step(1.5);
    expect(r.mission.delivered, JSON.stringify(r.cargo.root.position)).toBe(true);
    expect(r.damage.integrity).toBeGreaterThan(95);
    expect(r.damage.propertyDamage).toBe(0);
  } finally { r.dispose(); }
});

for (const level of levels.slice(10)) {
  it(`completes ${level.id} with real pickup, support and fork withdrawal`, () => {
    const r = rig(true, level);
    try {
      const driveTo = (z: number) => {
        for (let i = 0; i < 400 && r.cargo.root.position.z < z; i++) r.step(.05, ['KeyW']);
        r.step(1, ['Space']);
      };
      r.step(2);
      r.step(1.4, ['KeyW']); r.step(1, ['Space']);
      r.step(.65, ['KeyE']); r.step(.6, ['KeyT']); r.step(.5);
      for (const [, z] of level.inspections) {
        driveTo(z - .7);
        r.step(2.5, ['Space']);
      }
      if (level.target.rack) {
        driveTo(8.8);
        r.step(.6, ['KeyG']);
        const lift = (level.target.height ?? 0) + .5;
        r.step((lift - r.truck.lift) / .7, ['KeyE']);
        r.step(.5, ['Space']);
        driveTo(level.target.z - .95);
        expect(r.mission.delivered).toBe(false);
        const lowerTo = (level.target.height ?? 0) + .16;
        r.step((r.truck.lift - lowerTo) / .7, ['KeyQ']);
      } else {
        driveTo(level.target.z - .7);
        r.step(.6, ['KeyG']); r.step(.9, ['KeyQ']);
      }
      r.step(.5); r.step(2.2, ['KeyS']); r.step(1, ['Space']); r.step(2);
      expect(r.mission.delivered, JSON.stringify({ cargo: r.cargo.root.position, truck: r.truck.root.position, hint: r.mission.hint, integrity: r.damage.integrity, property: r.damage.propertyDamage })).toBe(true);
      expect(r.cargo.root.position.y).toBeCloseTo(level.target.height ?? 0, 1);
      expect(r.cargo.root.parent).toBeNull();
      expect(r.damage.integrity).toBeGreaterThan(95);
      expect(r.damage.propertyDamage).toBe(0);
    } finally { r.dispose(); }
  });
}
