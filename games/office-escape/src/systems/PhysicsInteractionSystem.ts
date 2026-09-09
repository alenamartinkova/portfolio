import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
export async function enablePhysics(scene: Scene) {
    const havok = await HavokPhysics({ locateFile: () => wasmUrl });
    scene.enablePhysics(new Vector3(0, -18, 0), new HavokPlugin(true, havok));
    scene.getPhysicsEngine()!.setTimeStep(1 / 60);
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
        return this.objects.filter(o => Vector3.Distance(o.mesh.position, p) < 2.5).sort((a, b) => Vector3.DistanceSquared(a.mesh.position, p) - Vector3.DistanceSquared(b.mesh.position, p))[0];
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
            const delta = p.add(forward.scale(1.5)).subtract(o.mesh.position);
            delta.y = 0;
            const velocity = o.aggregate.body.getLinearVelocity();
            velocity.y = 0;
            const force = delta.scale(35).subtract(velocity.scale(12));
            if (force.length() > 50)
                force.normalize().scaleInPlace(50);
            o.aggregate.body.applyImpulse(force.scale(dt), o.mesh.position);
        }
        for (const obj of this.objects) {
            const v = obj.aggregate.body.getLinearVelocity();
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
