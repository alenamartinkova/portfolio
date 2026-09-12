import { assertConstructionActive } from '../../../../shared/scene-construction.js';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
let havok: ReturnType<typeof HavokPhysics> | undefined;
export async function enablePhysics(scene: Scene) {
    havok ??= HavokPhysics({ locateFile: () => wasmUrl }).catch(error => { havok = undefined; throw error; });
    const module = await havok;
    assertConstructionActive(() => scene.isDisposed);
    scene.enablePhysics(new Vector3(0, -18, 0), new HavokPlugin(true, module));
    scene.getPhysicsEngine()!.setTimeStep(1 / 60);
}

/** Settle furniture without drawing the full office and shadow maps 35 times. */
export function settlePhysics(scene: Scene, steps = 35) {
    const constantDelta = scene.useConstantAnimationDeltaTime;
    scene.useConstantAnimationDeltaTime = true;
    try {
        for (let i = 0; i < steps; i++) {
            scene.incrementRenderId();
            for (const mesh of scene.meshes) mesh.computeWorldMatrix();
            scene.animate();
        }
    } finally { scene.useConstantAnimationDeltaTime = constantDelta; }
}
export interface Movable {
    mesh: Mesh;
    aggregate: PhysicsAggregate;
    spawn: Vector3;
    rotation: Quaternion;
    name: string;
}
export class PhysicsInteractionSystem {
    objects: Movable[] = [];
    private velocity = Vector3.Zero();
    private force = Vector3.Zero();
    onImpact = (_strength: number) => { };
    grabbed: Movable | null = null;
    constructor(private scene: Scene) { }
    rigid(mesh: Mesh, mass = 0, name = mesh.name) {
        mesh.isPickable = true;
        mesh.metadata = { solid: true, dynamic: mass > 0 };
        const aggregate = new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass, friction: mass ? .55 : .8, restitution: .015 }, this.scene);
        if (mass) {
            aggregate.body.setCollisionCallbackEnabled(true);
            aggregate.body.getCollisionObservable().add(event => { if (Math.abs(event.impulse) > 3)
                this.onImpact(Math.abs(event.impulse)); });
            aggregate.body.setLinearDamping(.65);
            aggregate.body.setAngularDamping(2.5);
            this.objects.push({ mesh, aggregate, spawn: mesh.position.clone(), rotation: mesh.rotationQuaternion?.clone() ?? Quaternion.Identity(), name });
        }
        return aggregate;
    }
    nearest(p: Vector3) {
        let nearest: Movable | undefined, distance = 6.25;
        for (const object of this.objects) {
            const squared = Vector3.DistanceSquared(object.mesh.position, p);
            if (squared < distance) { distance = squared; nearest = object; }
        }
        return nearest;
    }
    toggle(p: Vector3) { this.grabbed = this.grabbed ? null : this.nearest(p) ?? null; }
    update(dt: number, p: Vector3, forward: Vector3) {
        const o = this.grabbed;
        if (o) {
            if (Vector3.Distance(o.mesh.position, p) > 3 || p.y - o.mesh.position.y > 2) {
                this.grabbed = null;
                return;
            }
            // A horizontal spring only: furniture is never lifted or carried in mid-air.
            const delta = this.force.copyFrom(forward).scaleInPlace(1.5).addInPlace(p).subtractInPlace(o.mesh.position);
            delta.y = 0;
            const velocity = this.velocity;
            o.aggregate.body.getLinearVelocityToRef(velocity);
            velocity.y = 0;
            const force = delta.scaleInPlace(35).subtractInPlace(velocity.scaleInPlace(12));
            if (force.length() > 50)
                force.normalize().scaleInPlace(50);
            o.aggregate.body.applyImpulse(force.scaleInPlace(dt), o.mesh.position);
        }
        for (const obj of this.objects) {
            const v = this.velocity;
            obj.aggregate.body.getLinearVelocityToRef(v);
            if (v.length() > 7)
                obj.aggregate.body.setLinearVelocity(v.normalize().scale(7));
        }
    }
    reset() {
        this.grabbed = null;
        for (const o of this.objects) {
            o.mesh.position.copyFrom(o.spawn);
            o.mesh.rotationQuaternion = o.rotation.clone();
            o.aggregate.body.disablePreStep = false;
            o.aggregate.body.setLinearVelocity(Vector3.Zero());
            o.aggregate.body.setAngularVelocity(Vector3.Zero());
        }
    }
}
