import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import type { Cargo } from '../world/Cargo';

/** Feed grounded contact forces back to the chassis: animated forks cannot bulldoze a load. */
export class LoadResistance {
  active = false;
  private time = 0;
  private lastPush = -Infinity;
  private floorContacts = new Set<PhysicsBody>();
  private lastFloorContact = -Infinity;

  constructor(private cargo: Cargo, private chassis: PhysicsBody, private forks: PhysicsBody) {
    cargo.body.setCollisionCallbackEnabled(true);
    cargo.body.setCollisionEndedCallbackEnabled(true);
    cargo.body.getCollisionObservable().add(event => {
      const other = event.collider === cargo.body ? event.collidedAgainst : event.collider;
      if (other === chassis || other === forks) {
        // Vertical fork support is carrying, not pushing. Inserting into an empty
        // pallet opening generates no horizontal contact and remains unrestricted.
        if (event.normal && Math.abs(event.normal.y) < .55) this.lastPush = this.time;
      } else if (other.getMotionType() === PhysicsMotionType.STATIC && event.point && event.point.y < .07 && event.normal && Math.abs(event.normal.y) > .65) {
        this.floorContacts.add(other);
        this.lastFloorContact = this.time;
      }
    });
    cargo.body.getCollisionEndedObservable().add(event => {
      const other = event.collider === cargo.body ? event.collidedAgainst : event.collider;
      if (this.floorContacts.delete(other)) this.lastFloorContact = this.time;
    });
  }

  update(dt: number, throttle: number, forward: Vector3) {
    this.time += dt;
    // Require both real horizontal contact and floor support. A short grace period
    // bridges solver contact gaps; genuine lift clearance releases it immediately.
    const grounded = (this.floorContacts.size > 0 || this.time - this.lastFloorContact < .12)
      && this.cargo.root.position.y < .1;
    const towardLoad = Vector3.Dot(this.cargo.root.position.subtract(this.chassis.transformNode.position), forward) * throttle > 0;
    this.active = grounded && this.time - this.lastPush < .12 && towardLoad;
    if (!this.active) return 1;
    const velocity = this.cargo.body.getLinearVelocity();
    this.cargo.body.applyImpulse(new Vector3(-velocity.x, 0, -velocity.z).scale(this.cargo.mass * Math.min(1, dt * 9)), this.cargo.root.position);
    // A pallet can scrape a little, but heavier loads resist more. Reverse, steering,
    // and hydraulics remain available so the player can correct their approach.
    return Math.max(.025, .055 * 240 / this.cargo.mass);
  }
}
