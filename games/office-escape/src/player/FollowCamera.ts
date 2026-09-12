import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Input } from '../systems/Input';
export class FollowCamera {
    camera: FreeCamera;
    yaw = -.32;
    pitch = .57;
    impulse = 0;
    overviewTarget?: Vector3;
    overviewDistance = 14;
    private target = Vector3.Zero();
    constructor(private scene: Scene, spawn: Vector3, yaw = -.32) { this.target.copyFrom(spawn); this.camera = new FreeCamera('follow camera', spawn.add(new Vector3(4, 7, -10)), scene); this.camera.fov = .88; this.camera.minZ = .08; this.camera.maxZ = 160; this.yaw = yaw; this.snap(spawn); }
    update(dt: number, p: Vector3, input: Input, overview = false) {
        this.yaw += input.lookX * .005;
        this.pitch = Math.max(.2, Math.min(1.05, this.pitch + input.lookY * .004));
        input.lookX = 0;
        input.lookY = 0;
        this.target = Vector3.Lerp(this.target, overview && this.overviewTarget ? this.overviewTarget : p.add(new Vector3(0, .45, 0)), 1 - Math.exp(-12 * dt));
        const dist = overview ? this.overviewDistance : 7.6;
        const offset = new Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)).scale(dist);
        const ray = new Ray(this.target, offset.normalizeToNew(), dist);
        const hit = overview ? null : this.scene.pickWithRay(ray, m => Boolean(m.metadata?.solid) && !m.metadata?.dynamic);
        const distance = hit?.hit ? Math.max(.7, hit.distance - .25) : dist;
        const desired = this.target.add(offset.normalizeToNew().scale(distance));
        this.impulse *= Math.exp(-14 * dt);
        desired.y += this.impulse;
        this.camera.position = Vector3.Lerp(this.camera.position, desired, 1 - Math.exp(-10 * dt));
        this.camera.setTarget(this.target);
    }
    snap(p: Vector3) { this.target.copyFrom(p); this.camera.position.copyFrom(p.add(new Vector3(-Math.sin(this.yaw) * 7, 5, -Math.cos(this.yaw) * 7))); }
}
