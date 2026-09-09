import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Factory } from "../world/Factory";
import { compoundBody } from "../systems/Physics";
import { Input } from "../systems/Input";
export class ForkliftController {
  root: TransformNode;
  body: PhysicsBody;
  forkRoot: TransformNode;
  forkBody: PhysicsBody;
  wheels: Mesh[] = [];
  lift = 0.16;
  tilt = 0;
  speed = 0;
  hydraulic = 0;
  steer = 0;
  constructor(f: Factory, spawn: readonly [number, number] = [0, -11]) {
    this.root = new TransformNode("forklift chassis", f.scene);
    this.root.position.set(spawn[0], 0.68, spawn[1]);
    this.root.rotationQuaternion = Quaternion.Identity();
    const box = (n: string, s: number[], p: number[], c: string) =>
      f.box(n, s, p, c, this.root);
    box("yellow counterweight", [1.8, 0.85, 1.15], [0, 0.1, -0.72], "#efbd42");
    box("lower chassis", [1.72, 0.45, 2.7], [0, -0.17, 0], "#243943");
    box("yellow nose", [1.72, 0.5, 0.63], [0, 0.19, 0.7], "#edb837");
    box("rear bumper", [1.9, 0.18, 0.18], [0, -0.21, -1.4], "#182933");
    box("rear grille", [1.1, 0.32, 0.025], [0, 0.22, -1.31], "#34454c");
    for (let i = 0; i < 6; i++)
      box(
        "grille slit",
        [0.8, 0.022, 0.03],
        [0, 0.1 + i * 0.045, -1.33],
        "#121f28",
      );
    for (const x of [-0.87, 0.87])
      for (const z of [-0.85, 0.8]) {
        const w = f.cylinder(
          "rubber tire",
          0.78,
          0.3,
          [x, -0.25, z],
          "#1b2b32",
          this.root,
        );
        w.rotation.z = Math.PI / 2;
        this.wheels.push(w);
        const hub = f.cylinder(
          "wheel hub",
          0.39,
          0.315,
          [x, -0.25, z],
          "#829396",
          this.root,
        );
        hub.rotation.z = Math.PI / 2;
      }
    box("seat cushion", [0.66, 0.18, 0.6], [0, 0.56, -0.2], "#20313a");
    const back = box(
      "seat back",
      [0.68, 0.63, 0.14],
      [0, 0.88, -0.46],
      "#20313a",
    );
    back.rotation.x = -0.12;
    for (const x of [-0.78, 0.78])
      for (const z of [-0.8, 0.72])
        box(
          "overhead guard pillar",
          [0.09, 1.85, 0.09],
          [x, 1.24, z],
          "#273f4b",
        );
    box("yellow roof", [1.92, 0.12, 1.94], [0, 2.21, -0.05], "#efbd42");
    for (let i = 0; i < 5; i++)
      box(
        "roof rib",
        [0.08, 0.04, 1.7],
        [-0.65 + i * 0.32, 2.29, -0.05],
        "#253e49",
      );
    const beacon = f.cylinder(
      "amber beacon",
      0.21,
      0.18,
      [0.64, 2.37, -0.56],
      "#ff9b39",
      this.root,
    );
    beacon.material = f.mat("#ffae38", true);
    box("steering column", [0.09, 0.53, 0.09], [0, 0.68, 0.5], "#273a43");
    const wheel = f.cylinder(
      "steering wheel",
      0.4,
      0.045,
      [0, 0.97, 0.5],
      "#1b2d35",
      this.root,
    );
    wheel.rotation.x = 0.35;
    for (const x of [-0.68, 0.68]) {
      box("mast rail", [0.13, 2.9, 0.18], [x, 0.82, 1.26], "#293f4b");
      box("mast inner", [0.05, 2.5, 0.06], [x, 0.83, 1.14], "#9bacab");
    }
    for (const x of [-0.64, 0.64])
      box("headlight", [0.3, 0.16, 0.06], [x, 0.47, 1.035], "#ffffdc");
    f.label(
      "NORTHLINE",
      1.35,
      0.21,
      [0, 0.49, -1.31],
      "#293d43",
      "#efbd42",
      false,
      this.root,
    );
    f.label(
      "07",
      0.45,
      0.4,
      [0, -0.07, -1.41],
      "#f5e9bf",
      "#182933",
      false,
      this.root,
    );
    this.body = compoundBody(
      this.root,
      [{ size: [1.85, 1.15, 2.8], position: [0, -0.105, 0] }],
      1800,
      false,
      0.04,
      2,
      ~4,
    );
    this.body.setMassProperties({
      mass: 1800,
      inertia: new Vector3(0, 1800, 0),
      centerOfMass: new Vector3(0, -0.3, -0.35),
    });
    this.body.shape!.filterMembershipMask = 2;
    this.body.shape!.filterCollideMask = ~4;
    this.forkRoot = new TransformNode("fork carriage", f.scene);
    this.forkRoot.position.set(spawn[0], this.lift, spawn[1] + 1.38);
    this.forkRoot.rotationQuaternion = Quaternion.Identity();
    for (const x of [-0.62, 0.62])
      f.box(
        "steel fork",
        [0.21, 0.1, 2.4],
        [x, 0, 1.15],
        "#809ca7",
        this.forkRoot,
      );
    f.box(
      "load backrest",
      [1.6, 0.16, 0.14],
      [0, 0.22, -0.04],
      "#394e58",
      this.forkRoot,
    );
    for (const x of [-0.72, 0.72])
      f.box(
        "backrest upright",
        [0.08, 1.1, 0.11],
        [x, 0.56, -0.05],
        "#415963",
        this.forkRoot,
      );
    this.forkBody = compoundBody(
      this.forkRoot,
      [
        ...[-0.62, 0.62].map((x) => ({
          size: [0.21, 0.1, 2.4],
          position: [x, 0, 1.15],
        })),
        { size: [1.6, 1.15, 0.14], position: [0, 0.55, -0.04] },
      ],
      0,
      true,
      1.1,
      4,
      ~2,
    );
    this.forkBody.shape!.filterMembershipMask = 4;
    this.forkBody.shape!.filterCollideMask = ~2;
  }
  get forward() {
    return this.root.getDirection(Vector3.Forward());
  }
  update(dt: number, input: Input) {
    const forward = this.forward;
    const vel = this.body.getLinearVelocity();
    this.speed = Vector3.Dot(vel, forward);
    const throttle = input.axis("KeyW", "KeyS");
    const brake = input.keys.has("Space");
    this.steer = input.axis("KeyD", "KeyA");
    const target = brake ? 0 : throttle * (throttle > 0 ? 3.2 : 2.4);
    const response = brake ? 2.4 : throttle ? 1.6 : 1.1;
    const delta = (target - this.speed) * Math.min(1, response * dt);
    const side = this.root.getDirection(Vector3.Right());
    const lateral = Vector3.Dot(vel, side);
    this.body.applyImpulse(
      forward
        .scale(delta * 1800)
        .add(side.scale(-lateral * 1800 * Math.min(1, dt * 9))),
      this.root.position,
    );
    const yaw =
      (this.steer * this.speed * 0.43) / (1 + Math.abs(this.speed) * 0.1);
    this.body.setAngularVelocity(new Vector3(0, yaw, 0));
    const liftInput = input.axis("KeyE", "KeyQ");
    const tiltInput = input.axis("KeyG", "KeyT");
    this.hydraulic = Math.abs(liftInput) + Math.abs(tiltInput);
    this.lift = Math.max(
      0.12,
      Math.min(2.25, this.lift + liftInput * dt * 0.7),
    );
    this.tilt = Math.max(
      -0.18,
      Math.min(0.24, this.tilt + tiltInput * dt * 0.22),
    );
    const pos = this.root.position.add(forward.scale(1.4));
    pos.y = this.root.position.y - 0.68 + this.lift;
    const rot = this.root.rotationQuaternion!.multiply(
      Quaternion.RotationAxis(Vector3.Right(), this.tilt),
    );
    this.forkBody.setTargetTransform(pos, rot);
    for (const w of this.wheels) w.rotation.x += (this.speed * dt) / 0.39;
  }
}
