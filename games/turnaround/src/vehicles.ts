import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { compoundBody } from "./physics";
import { CompoundCollider } from "./physics";
import { equipmentParts, STAIR_BASE } from "./equipment";
import { Physics6DoFConstraint } from "@babylonjs/core/Physics/v2/physicsConstraint";
import { PhysicsConstraintAxis } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
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
  private trainSteering = 0;
  private velocity = Vector3.Zero();
  private forward = Vector3.Zero();
  private side = Vector3.Zero();
  private impulse = Vector3.Zero();
  private angular = Vector3.Zero();
  private rotation = Vector3.Zero();
  private inertia = Vector3.Zero();
  private inertiaOrientation = Quaternion.Identity();
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
      inertiaOrientation: this.inertiaOrientation,
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
    // A loaded train needs room to turn and a walking-speed reverse.
    this.trainSteering += (steer - this.trainSteering) * Math.min(1, dt * 4);
    const driveSpeed = this.id === "tug"
      ? throttle < 0 ? 1.8 : this.spec.speed - Math.abs(this.trainSteering) * 1.8
      : this.spec.speed;
    const target = attached || brake ? 0 : throttle * driveSpeed / magnitude;
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
        : this.id === "tug"
          ? this.trainSteering * speed / 5
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
    this.body.setMassProperties({ mass: this.spec.mass, inertia: this.inertia, inertiaOrientation: this.inertiaOrientation });
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

/** A limited vertical hinge. The primary constraint axis is world/local Y. */
function cartHinge(scene: Scene, a: PhysicsBody, b: PhysicsBody, pivotA: Vector3, pivotB: Vector3, limit: number) {
  const joint = new Physics6DoFConstraint({
    pivotA, pivotB, axisA: Vector3.Up(), axisB: Vector3.Up(),
    perpAxisA: new Vector3(0, 0, -1), perpAxisB: new Vector3(0, 0, -1),
  }, [
    ...[PhysicsConstraintAxis.LINEAR_X, PhysicsConstraintAxis.LINEAR_Y, PhysicsConstraintAxis.LINEAR_Z,
      PhysicsConstraintAxis.ANGULAR_Y, PhysicsConstraintAxis.ANGULAR_Z].map(axis => ({ axis, minLimit: 0, maxLimit: 0 })),
    { axis: PhysicsConstraintAxis.ANGULAR_X, minLimit: -limit, maxLimit: limit },
  ], scene);
  a.addConstraint(b, joint);
  return joint;
}

/** Four-wheel cart: the drawbar steers a separate front axle; the rear axle tracks the deck. */
export class BaggageCart {
  readonly root: TransformNode;
  readonly body: PhysicsBody;
  readonly frontAxle: TransformNode;
  readonly axleBody: PhysicsBody;
  readonly joint: Physics6DoFConstraint;
  readonly steeringJoint: Physics6DoFConstraint;
  private velocity = Vector3.Zero();
  private angular = Vector3.Zero();
  private side = Vector3.Zero();
  private offset = Vector3.Zero();
  private contact = Vector3.Zero();
  private impulse = Vector3.Zero();
  private localSide = new Vector3(1, 0, 0);
  private rearAxle = new Vector3(0, 0, 0.7);
  private axleCenter = Vector3.Zero();
  constructor(scene: Scene, parent: PhysicsBody, index: number) {
    this.root = new TransformNode(`baggage cart ${index + 1}`, scene);
    this.root.metadata = { dynamic: true, vehicle: "tug" };
    this.root.rotationQuaternion = parent.transformNode.rotationQuaternion!.clone();
    parent.transformNode.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(new Vector3(0, 0, 3.3), parent.transformNode.getWorldMatrix(), this.root.position);
    this.body = compoundBody(this.root, [
      { size: [1.7, 0.18, 2.2], position: [0, -0.25, 0] },
      { size: [1.8, 0.55, 0.3], position: [0, -0.325, 0.7] },
      { size: [1.6, 0.85, 2.05], position: [0, 0.15, 0] },
      { size: [0.15, 0.15, 0.55], position: [0, -0.2, 1.375] },
    ], 370);
    // Havok expects inertia per unit mass, in an explicitly upright principal frame.
    this.body.setMassProperties({ mass: 370, inertia: new Vector3(0, 260 / 370, 0), centerOfMass: Vector3.Zero(), inertiaOrientation: Quaternion.Identity() });
    this.body.setAngularDamping(0.25);
    this.frontAxle = new TransformNode(`baggage cart ${index + 1} steering axle`, scene);
    this.frontAxle.metadata = { dynamic: true, vehicle: "tug" };
    this.frontAxle.rotationQuaternion = this.root.rotationQuaternion.clone();
    this.root.computeWorldMatrix(true);
    Vector3.TransformCoordinatesToRef(new Vector3(0, 0, -0.7), this.root.getWorldMatrix(), this.frontAxle.position);
    this.axleBody = compoundBody(this.frontAxle, [
      { size: [1.8, 0.55, 0.3], position: [0, -0.325, 0] },
      { size: [0.15, 0.15, 0.95], position: [0, -0.2, -0.475] },
    ], 80);
    this.axleBody.setMassProperties({ mass: 80, inertia: new Vector3(0, 30 / 80, 0), centerOfMass: Vector3.Zero(), inertiaOrientation: Quaternion.Identity() });
    this.axleBody.setAngularDamping(0.25);
    this.steeringJoint = cartHinge(scene, this.body, this.axleBody, new Vector3(0, -0.2, -0.7), new Vector3(0, -0.2, 0), Math.PI / 3);
    // The front axle and its own deck overlap by design; external contacts stay enabled.
    this.steeringJoint.isCollisionsEnabled = false;
    this.joint = cartHinge(scene, parent, this.axleBody, new Vector3(0, -0.2, 1.65), new Vector3(0, -0.2, -0.95), Math.PI * 0.44);
    this.joint.isCollisionsEnabled = true;
    this.root.onDisposeObservable.add(() => {
      this.joint.dispose();
      this.steeringJoint.dispose();
      this.frontAxle.dispose();
    });
    this.body.setCollisionCallbackEnabled(true);
    this.axleBody.setCollisionCallbackEnabled(true);
  }
  beforeStep(dt: number, wet: boolean) {
    this.tireStep(this.body, this.rearAxle, 370, 260, dt, wet);
    this.tireStep(this.axleBody, this.axleCenter, 80, 30, dt, wet);
  }
  private tireStep(body: PhysicsBody, localAxle: Vector3, mass: number, inertia: number, dt: number, wet: boolean) {
    body.getLinearVelocityToRef(this.velocity);
    body.getAngularVelocityToRef(this.angular);
    if (this.velocity.lengthSquared() + this.angular.lengthSquared() < 0.000001) return;
    const root = body.transformNode;
    root.computeWorldMatrix(true);
    root.getDirectionToRef(this.localSide, this.side);
    Vector3.TransformNormalToRef(localAxle, root.getWorldMatrix(), this.offset);
    this.contact.copyFrom(root.position).addInPlace(this.offset);
    // Tire slip is measured at the axle (v + omega × r), not at the deck center.
    Vector3.CrossToRef(this.angular, this.offset, this.impulse);
    this.impulse.addInPlace(this.velocity);
    const lateral = Vector3.Dot(this.impulse, this.side);
    const lever = this.offset.z * this.side.x - this.offset.x * this.side.z;
    const effectiveMass = 1 / (1 / mass + lever * lever / inertia);
    const grip = 225 * 9.81 * (wet ? 0.55 : 0.9) * dt;
    const force = clamp(-lateral * effectiveMass * Math.min(1, dt * 24), -grip, grip);
    this.side.scaleToRef(force, this.impulse);
    body.applyImpulse(this.impulse, this.contact);
    // Rolling drag is horizontal: do not turn gravity/contact motion into a braking force.
    this.impulse.set(this.velocity.x, 0, this.velocity.z).scaleInPlace(-mass * Math.min(1, dt * 0.5));
    body.applyImpulse(this.impulse, root.position);
  }
  private bodySettled(body: PhysicsBody) {
    body.getLinearVelocityToRef(this.velocity);
    body.getAngularVelocityToRef(this.angular);
    return this.velocity.lengthSquared() < 0.0004 && this.angular.lengthSquared() < 0.0004;
  }
  get settled() {
    return this.bodySettled(this.body) && this.bodySettled(this.axleBody);
  }
}
