import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import { PhysicsMotionType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Cargo } from "../world/Cargo";
import { PropertyObject } from "../world/Warehouse";
export class DamageSystem {
  integrity = 100;
  propertyDamage = 0;
  collisions = 0;
  private age = 0;
  private cooldown = new Map<PhysicsBody, number>();
  private moved = new Set<PropertyObject>();
  private velocities = new Map<PhysicsBody, Vector3>();
  constructor(
    plugin: HavokPlugin,
    private cargo: Cargo,
    private property: PropertyObject[],
    truck: PhysicsBody,
    private impact: (strength: number, pos: Vector3) => void,
  ) {
    for (const b of [
      cargo.body,
      truck,
      ...property.map((p) => p.mesh.physicsBody!),
    ])
      b.setCollisionCallbackEnabled(true);
    plugin.onCollisionObservable.add((e) => {
      if (this.age < 1.5) return;
      for (const body of [e.collider, e.collidedAgainst]) {
        const prop = this.property.find(
          (p) => p.breakMass && p.mesh.physicsBody === body,
        );
        if (
          prop &&
          Math.abs(e.impulse) > 1400 &&
          body.getMotionType() === PhysicsMotionType.STATIC
        ) {
          for (const part of this.property.filter(
            (p) => p.breakGroup === prop.breakGroup && p.breakMass,
          )) {
            const partBody = part.mesh.physicsBody!;
            partBody.setMotionType(PhysicsMotionType.DYNAMIC);
            partBody.setMassProperties({ mass: part.breakMass! });
            partBody.setAngularDamping(0.5);
          }
        }
      }
      const isCargo =
        e.collider === cargo.body || e.collidedAgainst === cargo.body;
      const isTruck = e.collider === truck || e.collidedAgainst === truck;
      // Impulse / mass approximates abrupt velocity change; resting support is below the threshold.
      const effectiveMass = isCargo ? cargo.mass : isTruck ? 900 : 12;
      const a = this.velocities.get(e.collider) ?? Vector3.Zero();
      const b = this.velocities.get(e.collidedAgainst) ?? Vector3.Zero();
      const relative = a.subtract(b);
      const approach = e.normal
        ? Math.abs(Vector3.Dot(relative, e.normal))
        : relative.length();
      const strength = Math.min(approach, Math.abs(e.impulse) / effectiveMass);

      const key = isCargo ? cargo.body : isTruck ? truck : e.collider;
      if (strength < 1.05 || this.age - (this.cooldown.get(key) ?? -10) < 0.6)
        return;
      this.cooldown.set(key, this.age);
      if (isCargo)
        this.integrity = Math.max(
          0,
          this.integrity - Math.min(35, (strength - 0.8) * 6 * cargo.fragility),
        );
      if (isTruck && strength > 1.65) this.collisions++;
      if (isCargo || isTruck)
        this.impact(strength, e.point ?? cargo.root.position);
    });
  }
  beforeStep(bodies: PhysicsBody[]) {
    for (const b of bodies) this.velocities.set(b, b.getLinearVelocity());
  }
  update(dt: number) {
    this.age += dt;
    if (this.age < 1.5) return;
    for (const p of this.property) {
      if (
        !this.moved.has(p) &&
        Vector3.Distance(p.mesh.position, p.start) > 0.48
      ) {
        this.moved.add(p);
        this.propertyDamage += p.value;
        this.impact(0.7, p.mesh.position);
      }
    }
  }
}
