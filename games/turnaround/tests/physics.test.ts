import { beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import HavokPhysics from "@babylonjs/havok";
import {
  NullEngine,
  Scene,
  HavokPlugin,
  Vector3,
  MeshBuilder,
  FreeCamera,
  Matrix,
  Viewport,
} from "@babylonjs/core";
import { rigid } from "../src/physics";
import { RampVehicle } from "../src/vehicles";
import { buildAircraftColliders } from "../src/equipment";
import { dockQuality, tasksFor, type VehicleId } from "../src/core/operations";
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
function rig(id: VehicleId, wet = false) {
  const engine = new NullEngine(),
    scene = new Scene(engine),
    plugin = new HavokPlugin(true, havok);
  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  const ground = MeshBuilder.CreateBox(
    "ground",
    { width: 200, height: 1, depth: 200 },
    scene,
  );
  ground.position.y = -0.55;
  rigid(ground);
  const vehicle = new RampVehicle(scene, id);
  const step = (
    seconds: number,
    throttle = 0,
    steer = 0,
    brake = false,
    lift = 0,
    attached = false,
  ) => {
    for (let i = 0; i < seconds * 120; i++) {
      scene.incrementRenderId();
      vehicle.root.computeWorldMatrix(true);
      vehicle.beforeStep(1 / 120, throttle, steer, brake, lift, wet, attached);
      scene.getPhysicsEngine()!._step(1 / 120);
      vehicle.sync();
    }
  };
  step(1);
  return {
    scene,
    vehicle,
    step,
    dispose: () => {
      scene.dispose();
      engine.dispose();
    },
  };
}
it("right steering turns the moving chassis toward its right side", () => {
  const r = rig("tug");
  try {
    const { x, z } = r.vehicle.pose;
    const camera = new FreeCamera("view behind the cab", new Vector3(x, 8, z + 14), r.scene);
    camera.setTarget(new Vector3(x, 0, z));
    const transform = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
    const project = (px: number, pz: number) => Vector3.Project(new Vector3(px, 0, pz), Matrix.Identity(), transform, new Viewport(0, 0, 1280, 900)).x;
    r.step(1, 1, 1);
    expect(project(r.vehicle.pose.x, r.vehicle.pose.z)).toBeGreaterThan(project(x, z) + 8);
  } finally { r.dispose(); }
});
it("raised stairs hit an overhead obstacle that the lowered stairs fit beneath", () => {
  for (const raised of [false, true]) {
    const r = rig("stairs");
    try {
      const beam = MeshBuilder.CreateBox("overhead beam", { width: 1, height: 0.4, depth: 8 }, r.scene);
      beam.position.set(-10, 3.1, -4.8); rigid(beam);
      if (raised) r.step(1.9, 0, 0, true, 1);
      r.step(6, 1);
      if (raised) expect(r.vehicle.pose.x).toBeLessThan(-11);
      else expect(r.vehicle.pose.x).toBeGreaterThan(-9);
    } finally { r.dispose(); }
  }
});
for (const direction of [-1, 1])
  it(`walking ${direction < 0 ? "A" : "D"} moves screen-${direction < 0 ? "left" : "right"} without turning`, () => {
    const r = rig("crew");
    try {
      const { x, z, heading } = r.vehicle.pose;
      r.step(1.2, 0, direction);
      const camera = new FreeCamera("actual ramp view", new Vector3(40, 55, 52), r.scene);
      camera.setTarget(Vector3.Zero());
      const transform = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
      const project = (px: number, pz: number) => Vector3.Project(new Vector3(px, 0, pz), Matrix.Identity(), transform, new Viewport(0, 0, 1280, 900)).x;
      expect((project(r.vehicle.pose.x, r.vehicle.pose.z) - project(x, z)) * direction).toBeGreaterThan(8);
      expect(r.vehicle.pose.heading).toBeCloseTo(heading, 2);
      expect(r.vehicle.pose.speed).toBeGreaterThan(1);
    } finally { r.dispose(); }
  });
it("Havok drives, reverses, brakes and keeps a connected service stationary", () => {
  const r = rig("stairs");
  try {
    const start = r.vehicle.pose.x;
    r.step(1.7, 1);
    expect(r.vehicle.pose.x).toBeGreaterThan(start + 3);
    r.step(1, 0, 0, true);
    expect(Math.abs(r.vehicle.pose.speed)).toBeLessThan(0.05);
    const stopped = r.vehicle.pose.x;
    r.step(2, -1);
    expect(r.vehicle.pose.x).toBeLessThan(stopped - 4);
    r.step(1, 0, 0, true);
    const parked = r.vehicle.pose.x;
    r.step(2, 1, 1, false, 1, true);
    expect(Math.abs(r.vehicle.pose.x - parked)).toBeLessThan(0.05);
  } finally {
    r.dispose();
  }
});
for (const id of ["stairs", "belt", "fuel", "catering", "water"] as const)
  it(`${id}: real chassis can reach its service dock at the authored heading and height`, () => {
    const r = rig(id, id === "fuel");
    try {
      buildAircraftColliders(r.scene);
      const target = tasksFor(2).find((t) => t.vehicle === id)!;
      for (let i = 0; i < 14 * 120; i++) {
        const remaining = Math.abs(r.vehicle.pose.x - target.at[0]);
        const throttle = Math.min(1, remaining / 5);
        const lift =
          target.height === undefined
            ? 0
            : Math.abs(target.height - r.vehicle.pose.height) < 0.02
              ? 0
              : Math.sign(target.height - r.vehicle.pose.height);
        r.step(
          1 / 120,
          remaining > 0.15 ? throttle : 0,
          0,
          remaining < 0.15,
          lift,
        );
      }
      r.step(0.5, 0, 0, true);
      expect(dockQuality(target, r.vehicle.pose)).toBe("perfect");
    } finally {
      r.dispose();
    }
  });
it("wet braking travels farther and a chassis cannot pass through an aircraft collider", () => {
  const dry = rig("fuel"),
    wet = rig("fuel", true);
  try {
    dry.step(2, 1);
    wet.step(2, 1);
    const a = dry.vehicle.pose.x,
      b = wet.vehicle.pose.x;
    dry.step(1, 0, 0, true);
    wet.step(1, 0, 0, true);
    expect(Math.abs(wet.vehicle.pose.x - b)).toBeGreaterThan(
      Math.abs(dry.vehicle.pose.x - a),
    );
    const obstacle = MeshBuilder.CreateBox(
      "aircraft",
      { width: 2.5, height: 3, depth: 13 },
      dry.scene,
    );
    obstacle.position.set(0, 1.6, 0);
    rigid(obstacle);
    dry.step(10, 1);
    expect(dry.vehicle.pose.x).toBeGreaterThan(3.5);
  } finally {
    dry.dispose();
    wet.dispose();
  }
});
it("baggage trailers stay hitched through turns and reverse, and cannot cross a wall", () => {
  const r = rig("tug");
  try {
    const carts = r.vehicle.trailers;
    const gap = () => {
      let parent = r.vehicle.root;
      for (const cart of carts) {
        parent.computeWorldMatrix(true); cart.root.computeWorldMatrix(true);
        const a = Vector3.TransformCoordinates(new Vector3(0, -0.2, 1.65), parent.getWorldMatrix());
        const b = Vector3.TransformCoordinates(new Vector3(0, -0.2, -1.65), cart.root.getWorldMatrix());
        expect(Vector3.Distance(a, b)).toBeLessThan(0.12);
        parent = cart.root;
      }
    };
    r.step(1.3, 1, 0.5); gap();
    r.step(1, 0, 0, true); gap();
    r.step(1.2, -1, -0.4); gap();
    r.step(7, 0, 0, true);
    expect(r.vehicle.settled).toBe(true);
  } finally { r.dispose(); }
  const r2 = rig("tug");
  try {
    const wall = MeshBuilder.CreateBox("wall behind trailers", { width: 80, height: 3, depth: 1 }, r2.scene);
    wall.position.set(-24, 1.5, 20); rigid(wall);
    r2.step(8, -1);
    for (const cart of r2.vehicle.trailers) expect(cart.root.position.z).toBeLessThan(19);
  } finally { r2.dispose(); }
});
it("settlement includes lateral, vertical and rotational motion and driving wakes a rested chassis", () => {
  const r = rig("crew");
  try {
    r.step(2, 0, 0, true);
    expect(r.vehicle.settled).toBe(true);
    for (const velocity of [new Vector3(0.2, 0, 0), new Vector3(0, -0.3, 0)]) {
      r.vehicle.body.setLinearVelocity(velocity);
      expect(r.vehicle.settled).toBe(false);
    }
    r.vehicle.body.setLinearVelocity(Vector3.Zero());
    r.vehicle.body.setAngularVelocity(new Vector3(0, 0.2, 0));
    expect(r.vehicle.settled).toBe(false);
    r.step(2, 0, 0, true);
    expect(r.vehicle.settled).toBe(true);
    const z = r.vehicle.pose.z;
    r.step(0.5, 1);
    expect(r.vehicle.settled).toBe(false);
    expect(Math.abs(r.vehicle.pose.z - z)).toBeGreaterThan(0.2);
  } finally {
    r.dispose();
  }
});
