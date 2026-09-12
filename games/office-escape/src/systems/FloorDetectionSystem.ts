import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

export class FloorDetectionSystem {
    private failed = false;
    private ray = new Ray(Vector3.Zero(), Vector3.Down(), 1.05);
    /** Called only for physics-confirmed support, before a jump or mantle can leave it. */
    checkContact(scene: Scene, position: Vector3, feet: number, supportDistance: number) {
        if (this.failed) return true;
        this.ray.origin.copyFrom(position);
        this.ray.length = position.y - feet + supportDistance;
        const hit = scene.pickWithRay(this.ray, mesh => Boolean(mesh.metadata?.solid));
        const forbidden = Boolean(hit?.pickedMesh?.metadata?.forbidden && hit.pickedPoint && Math.abs(feet - hit.pickedPoint.y) <= supportDistance);
        return this.update(forbidden);
    }
    update(onForbiddenFloor: boolean, fallenOut = false) {
        this.failed ||= onForbiddenFloor || fallenOut;
        return this.failed;
    }
    reset() { this.failed = false; }
}
