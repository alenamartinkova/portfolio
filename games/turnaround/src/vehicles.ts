import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { compoundBody } from "./physics";
import { CompoundCollider } from "./physics";
import { equipmentParts, STAIR_BASE } from "./equipment";
import { HingeConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { clamp, VEHICLES, type Pose, type VehicleId } from "./core/operations";

/** Forklift's Havok impulse chassis, with mass, steering and wet traction per service vehicle. */
export class RampVehicle {
  readonly root: TransformNode;
  readonly body: PhysicsBody;
  readonly platform: TransformNode;
  readonly pose: Pose;
  readonly spec: (typeof VEHICLES)[number];
  readonly trailers: BaggageCart[] = [];
  private liftCollider?: CompoundCollider;
  private colliderHeight = NaN;
  private velocity = Vector3.Zero();
  private forward = Vector3.Zero();
  private side = Vector3.Zero();
  private impulse = Vector3.Zero();
  private angular = Vector3.Zero();
  private rotation = Vector3.Zero();
  private inertia = Vector3.Zero();
  constructor(
    scene: Scene,
    readonly id: VehicleId,
  ) {
    this.spec = VEHICLES.find((v) => v.id === id)!;
    this.inertia.set(0, this.spec.mass, 0);
    this.root = new TransformNode(id, scene);
    this.root.metadata = { dynamic: true, vehicle: id };
    this.platform = new TransformNode(`${id} platform`, scene);
    this.platform.parent = this.root;
    this.root.position.set(
      this.spec.at[0],
      id === "crew" ? 0.65 : 0.7,
      this.spec.at[1],
    );
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(
      -this.spec.heading,
      0,
      0,
    );
    this.body = compoundBody(
      this.root,
      equipmentParts(id, this.spec.height),
      this.spec.mass,
      0.04,
    );
    this.body.setMassProperties({
      mass: this.spec.mass,
      inertia: this.inertia,
    });
    this.body.setCollisionCallbackEnabled(true);
    this.pose = {
      x: this.spec.at[0],
      z: this.spec.at[1],
      speed: 0,
      heading: this.spec.heading,
      height: this.spec.height,
    };
    if (["stairs", "belt", "catering"].includes(id)) {
      this.liftCollider = new CompoundCollider(scene);
      this.root.onDisposeObservable.add(() => this.liftCollider?.dispose());
      this.updateLift();
    }
    if (id === "tug") {
      let parent = this.body;
      for (let i = 0; i < 2; i++) {
        const cart = new BaggageCart(scene, parent, i);
        this.trailers.push(cart);
        parent = cart.body;
      }
    }
  }
  beforeStep(
    dt: number,
    throttle: number,
    steer: number,
    brake: boolean,
    lift: number,
    wet: boolean,
    attached: boolean,
  ) {
    this.sync();
    const heading = this.pose.heading;
    this.forward.set(Math.sin(heading), 0, -Math.cos(heading));
    this.side.set(Math.cos(heading), 0, Math.sin(heading));
    this.body.getLinearVelocityToRef(this.velocity);
    const speed = Vector3.Dot(this.velocity, this.forward),
      lateral = Vector3.Dot(this.velocity, this.side);
    const walking = this.id === "crew";
    // Walking follows the fixed camera: A is screen-left and D screen-right.
    // Vehicles keep steering relative to their nose, including reversal when backing up.
    const magnitude = walking ? Math.max(1, Math.hypot(throttle, steer)) : 1;
    const target = attached || brake ? 0 : throttle * this.spec.speed / magnitude;
    const lateralTarget = walking && !attached && !brake ? -steer * this.spec.speed / magnitude : 0;
    const response = attached || brake ? (wet ? 3.5 : 6) : throttle || (walking && steer) ? 1.5 : 2.5;
    this.forward.scaleToRef(
      (target - speed) * Math.min(1, dt * response) * this.spec.mass,
      this.impulse,
    );
    this.impulse.addInPlace(
      this.side.scaleInPlace(
        (lateralTarget - lateral) * this.spec.mass * Math.min(1, dt * (walking ? response : wet ? 3 : 9)),
      ),
    );
    this.body.applyImpulse(this.impulse, this.root.position);
    const yaw = attached
      ? 0
      : walking
        ? 0
        : (steer * speed * this.spec.turn) / (1 + Math.abs(speed) * 0.15);
    // Babylon's left-handed view sees local -X to the right of a -Z-facing cab.
    this.body.setAngularVelocity(this.angular.set(0, yaw, 0));
    if (!attached && this.liftCollider)
      this.pose.height = clamp(this.pose.height + lift * dt * 0.7, 0.6, 3.5);
    this.updateLift();
    for (const cart of this.trailers) cart.beforeStep(dt, wet);
  }
  private updateLift() {
    const height = this.pose.height;
    if (!this.liftCollider || height === this.colliderHeight) return;
    this.colliderHeight = height;
    this.liftCollider.update(equipmentParts(this.id, height));
    this.body.shape = this.liftCollider.shape;
    this.body.setMassProperties({ mass: this.spec.mass, inertia: this.inertia });
    if (this.id === "stairs" || this.id === "belt") {
      const base = this.id === "stairs" ? STAIR_BASE : 0.55;
      this.platform.position.y = base - 0.55;
      this.platform.scaling.y = height - base;
    } else this.platform.position.y = height - 0.55;
  }
  sync() {
    this.root.rotationQuaternion!.toEulerAnglesToRef(this.rotation);
    this.body.getLinearVelocityToRef(this.velocity);
    this.pose.x = this.root.position.x;
    this.pose.z = this.root.position.z;
    this.pose.heading = -this.rotation.y;
    this.pose.speed = this.id === "crew"
      ? Math.hypot(this.velocity.x, this.velocity.z)
      : Math.sin(this.pose.heading) * this.velocity.x - Math.cos(this.pose.heading) * this.velocity.z;
  }
  /** Include sideways/falling motion and yaw; forward speed alone cannot prove rest. */
  get settled() {
    this.body.getLinearVelocityToRef(this.velocity);
    this.body.getAngularVelocityToRef(this.angular);
    return (
      this.velocity.lengthSquared() < 0.0004 &&
      this.angular.lengthSquared() < 0.0004 &&
      this.trailers.every(cart => cart.settled)
    );
  }
}

/** Passive wheeled trailers; joints and contacts determine their position, including in reverse. */
export class BaggageCart {
  readonly root: TransformNode;
  readonly body: PhysicsBody;
  readonly joint: HingeConstraint;
  private velocity = Vector3.Zero();
  private angular = Vector3.Zero();
  private side = Vector3.Zero();
  private impulse = Vector3.Zero();
  private localSide = new Vector3(1, 0, 0);
  constructor(scene: Scene, parent: PhysicsBody, index: number) {
    this.root = new TransformNode(`baggage cart ${index + 1}`, scene);
    this.root.metadata = { dynamic: true, vehicle: "tug" };
    this.root.rotationQuaternion = parent.transformNode.rotationQuaternion!.clone();
    parent.transformNode.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(new Vector3(0, 0, 3.3), parent.transformNode.getWorldMatrix(), this.root.position);
    this.body = compoundBody(this.root, [
      { size: [1.8, 0.35, 2.2], position: [0, -0.425, 0] },
      { size: [1.6, 0.85, 2.05], position: [0, 0.15, 0] },
      { size: [0.15, 0.15, 0.55], position: [0, -0.2, -1.375] },
    ], 450);
    this.body.setMassProperties({ mass: 450, inertia: new Vector3(0, 700, 0) });
    this.body.setAngularDamping(2);
    this.joint = new HingeConstraint(new Vector3(0, -0.2, 1.65), new Vector3(0, -0.2, -1.65), Vector3.Up(), Vector3.Up(), scene);
    parent.addConstraint(this.body, this.joint);
    this.joint.isCollisionsEnabled = true;
    this.root.onDisposeObservable.add(() => this.joint.dispose());
    this.body.setCollisionCallbackEnabled(true);
  }
  beforeStep(dt: number, wet: boolean) {
    this.body.getLinearVelocityToRef(this.velocity);
    if (this.velocity.lengthSquared() < 0.000001) return;
    this.root.getDirectionToRef(this.localSide, this.side);
    const lateral = Vector3.Dot(this.velocity, this.side);
    this.side.scaleToRef(-lateral * 450 * Math.min(1, dt * (wet ? 3 : 9)), this.impulse);
    this.impulse.addInPlace(this.velocity.scaleInPlace(-450 * Math.min(1, dt * 0.5)));
    this.body.applyImpulse(this.impulse, this.root.position);
  }
  get settled() {
    this.body.getLinearVelocityToRef(this.velocity);
    this.body.getAngularVelocityToRef(this.angular);
    return this.velocity.lengthSquared() < 0.0004 && this.angular.lengthSquared() < 0.0004;
  }
}
