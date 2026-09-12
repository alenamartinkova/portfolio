import { createCachedRaycast } from '../../../../shared/cached-raycast.js';
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Input } from "../systems/Input";
import { ForkliftController } from "./ForkliftController";
export class FollowCamera {
  camera: FreeCamera;
  orbit = -0.13;
  elevation = 0.44;
  shake = 0;
  private initialized = false;
  private target = Vector3.Zero();
  private desired = Vector3.Zero();
  private direction = Vector3.Zero();
  private ray = new Ray(this.target, this.direction);
  private pickStatic = createCachedRaycast((ray: Ray) => this.scene.pickWithRay(ray, this.obstacle));
  private obstacle = (mesh: import('@babylonjs/core/Meshes/abstractMesh').AbstractMesh) => this.walls.has(mesh as Mesh);
  constructor(
    private scene: Scene,
    private truck: ForkliftController,
    private walls: Set<Mesh>,
  ) {
    this.camera = new FreeCamera("follow", new Vector3(0, 7, -19), scene);
    this.camera.minZ = 0.12;
    this.camera.maxZ = 110;
    this.camera.fov = 0.88;
    this.camera.inputs.clear();
  }
  update(dt: number, input: Input, mobile = false) {
    const portrait = this.scene.getEngine().getAspectRatio(this.camera) < 1;
    // Keep a useful horizontal field of view on a phone, where a fixed vertical
    // field of view otherwise crops the truck at both sides.
    this.camera.fovMode = mobile && portrait ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
    this.camera.fov = mobile ? .95 : .88;
    this.orbit +=
      input.axis("ArrowRight", "ArrowLeft") * dt * 1.4 + input.lookX * 0.004;
    this.elevation = Math.max(
      0.22,
      Math.min(
        0.95,
        this.elevation -
          input.lookY * 0.003 +
          input.axis("ArrowUp", "ArrowDown") * dt * 0.6,
      ),
    );
    input.lookX = 0;
    input.lookY = 0;
    const target = this.target.copyFrom(this.truck.forward).scaleInPlace(mobile ? .6 : 1.35).addInPlace(this.truck.root.position);
    target.y += .75;
    const yaw = Math.atan2(this.truck.forward.x, this.truck.forward.z) + this.orbit;
    const desired = this.desired.set(-Math.sin(yaw) * (mobile ? 11 : 9), Math.sin(this.elevation) * 10 + 1.2, -Math.cos(yaw) * (mobile ? 11 : 9)).addInPlace(target);
    desired.subtractToRef(target, this.direction);
    this.ray.length = this.direction.length(); this.direction.normalize();
    const hit = this.pickStatic(this.ray);
    if (hit?.hit && hit.pickedPoint) {
      this.direction.scaleToRef(.5, desired);
      desired.scaleInPlace(-1).addInPlace(hit.pickedPoint);
    }
    desired.x = Math.max(-17.2, Math.min(17.2, desired.x));
    desired.z = Math.max(-20, Math.min(20, desired.z));
    desired.y = Math.max(2.3, desired.y);
    // When a wall compresses the chase distance, rise above the overhead guard.
    const clearance = Math.hypot(desired.x - target.x, desired.z - target.z);
    if (clearance < 5)
      desired.y = Math.max(desired.y, target.y + (mobile ? 6 : 4.5) + (5 - clearance) * 0.6);
    if (!this.initialized) {
      this.camera.position.copyFrom(desired);
      this.initialized = true;
    } else
      Vector3.LerpToRef(
        this.camera.position,
        desired,
        1 - Math.exp(-dt * 7), this.camera.position,
      );
    if (
      Math.hypot(
        this.camera.position.x - target.x,
        this.camera.position.z - target.z,
      ) < 3.5
    )
      this.camera.position.y = Math.max(this.camera.position.y, target.y + 3.5);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    target.x += Math.sin(performance.now() * .07) * this.shake;
    target.y += Math.cos(performance.now() * .055) * this.shake * .5;
    this.camera.setTarget(target);
  }
}
