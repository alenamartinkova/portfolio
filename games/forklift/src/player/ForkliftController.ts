import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Factory } from "../world/Factory";
import { compoundBody } from "../systems/Physics";
import { Input } from "../systems/Input";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { defaultStyle, type TruckStyle } from "./Customization";
import { TruckModel } from "./TruckModel";
import type { Cargo } from "../world/Cargo";
import { LoadResistance } from "../systems/LoadResistance";
export class ForkliftController {
  root: TransformNode;
  body: PhysicsBody;
  forkRoot: TransformNode;
  forkBody: PhysicsBody;
  wheels: Mesh[] = [];
  readonly workLight: SpotLight;
  readonly model: TruckModel;
  private loadResistance?: LoadResistance;
  private velocity = Vector3.Zero();
  private side = Vector3.Zero();
  private impulse = Vector3.Zero();
  private angular = Vector3.Zero();
  private forkPosition = Vector3.Zero();
  private forkRotation = Quaternion.Identity();
  private tiltRotation = Quaternion.Identity();
  private forwardVector = Vector3.Zero();
  private localForward = Vector3.Forward();
  private localRight = Vector3.Right();
  get pushingGroundedLoad() { return this.loadResistance?.active ?? false; }
  setCargo(cargo: Cargo) { this.loadResistance = new LoadResistance(cargo, this.body, this.forkBody); }
  lift = 0.16;
  tilt = 0;
  speed = 0;
  hydraulic = 0;
  steer = 0;
  constructor(f: Factory, spawn: readonly [number, number] = [0, -11], style: TruckStyle = defaultStyle) {
    this.root = new TransformNode("forklift chassis", f.scene);
    this.root.position.set(spawn[0], 0.68, spawn[1]);
    this.root.rotationQuaternion = Quaternion.Identity();
    this.workLight = new SpotLight("truck work light", new Vector3(0, 2.15, 1.02), new Vector3(0, -.28, 1), Math.PI / 2.6, 2, f.scene);
    this.workLight.parent = this.root;
    this.workLight.diffuse = Color3.FromHexString("#fff0cb");
    this.workLight.range = 32;
    this.workLight.intensity = 1.35;
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
    this.model = new TruckModel(f, this.root, this.forkRoot);
    this.wheels = this.model.wheels;
    this.model.update(0, 0, 0, this.lift, this.tilt);
    this.applyStyle(style);
    this.setWorkLight(true);
  }
  applyStyle(value: TruckStyle) {
    this.model.applyStyle(value);
  }
  setWorkLight(on: boolean) {
    this.workLight.setEnabled(on);
    this.model.setWorkLight(on);
  }
  get forward() {
    this.root.getDirectionToRef(this.localForward, this.forwardVector);
    return this.forwardVector;
  }
  update(dt: number, input: Input) {
    const forward = this.forward;
    const vel = this.velocity; this.body.getLinearVelocityToRef(vel);
    this.speed = Vector3.Dot(vel, forward);
    const throttle = input.axis("KeyW", "KeyS");
    const brake = input.keys.has("Space");
    this.steer = input.axis("KeyD", "KeyA");
    const traction = this.loadResistance?.update(dt, throttle, forward) ?? 1;
    const target = brake ? 0 : throttle * (throttle > 0 ? 3.2 : 2.4) * traction;
    const response = brake ? 2.4 : traction < 1 ? 10 : throttle ? 1.6 : 1.1;
    const delta = (target - this.speed) * Math.min(1, response * dt);
    const side = this.side; this.root.getDirectionToRef(this.localRight, side);
    const lateral = Vector3.Dot(vel, side);
    forward.scaleToRef(delta * 1800, this.impulse);
    this.impulse.addInPlace(side.scaleInPlace(-lateral * 1800 * Math.min(1, dt * 9)));
    if (this.impulse.lengthSquared() > 1e-8) this.body.applyImpulse(this.impulse, this.root.position);
    const yaw = (this.steer * this.speed * .43) / (1 + Math.abs(this.speed) * .1);
    this.body.getAngularVelocityToRef(this.angular);
    if (Math.abs(this.angular.y - yaw) > 1e-6 || Math.abs(this.angular.x) + Math.abs(this.angular.z) > 1e-6)
      this.body.setAngularVelocity(this.angular.set(0, yaw, 0));
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
    const pos = this.forkPosition.copyFrom(forward).scaleInPlace(1.4).addInPlace(this.root.position);
    pos.y = this.root.position.y - .68 + this.lift;
    Quaternion.RotationAxisToRef(this.localRight, this.tilt, this.tiltRotation);
    this.root.rotationQuaternion!.multiplyToRef(this.tiltRotation, this.forkRotation);
    // Havok targets encode velocity for the next step. Re-submit even at rest:
    // skipping a target can leave the carriage moving with its previous velocity.
    this.forkBody.setTargetTransform(pos, this.forkRotation);
    this.model.update(dt, this.speed, this.steer, this.lift, this.tilt);
  }
}
