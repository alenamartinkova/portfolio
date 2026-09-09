import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
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
  update(dt: number, input: Input) {
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
    const target = this.truck.root.position
      .add(new Vector3(0, 0.75, 0))
      .add(this.truck.forward.scale(1.35));
    const yaw =
      Math.atan2(this.truck.forward.x, this.truck.forward.z) + this.orbit;
    const desired = target.add(
      new Vector3(
        -Math.sin(yaw) * 9,
        Math.sin(this.elevation) * 10 + 1.2,
        -Math.cos(yaw) * 9,
      ),
    );
    const direction = desired.subtract(target);
    const hit = this.scene.pickWithRay(
      new Ray(target, direction.normalizeToNew(), direction.length()),
      (m) => this.walls.has(m as Mesh),
    );
    if (hit?.hit && hit.pickedPoint)
      desired.copyFrom(
        hit.pickedPoint.subtract(direction.normalizeToNew().scale(0.5)),
      );
    desired.x = Math.max(-17.2, Math.min(17.2, desired.x));
    desired.z = Math.max(-20, Math.min(20, desired.z));
    desired.y = Math.max(2.3, desired.y);
    // When a wall compresses the chase distance, rise above the overhead guard.
    const clearance = Math.hypot(desired.x - target.x, desired.z - target.z);
    if (clearance < 5)
      desired.y = Math.max(desired.y, target.y + 4.5 + (5 - clearance) * 0.6);
    if (!this.initialized) {
      this.camera.position.copyFrom(desired);
      this.initialized = true;
    } else
      this.camera.position = Vector3.Lerp(
        this.camera.position,
        desired,
        1 - Math.exp(-dt * 7),
      );
    if (
      Math.hypot(
        this.camera.position.x - target.x,
        this.camera.position.z - target.z,
      ) < 3.5
    )
      this.camera.position.y = Math.max(this.camera.position.y, target.y + 3.5);
    this.shake = Math.max(0, this.shake - dt * 1.8);
    target.addInPlace(
      new Vector3(
        Math.sin(performance.now() * 0.07) * this.shake,
        Math.cos(performance.now() * 0.055) * this.shake * 0.5,
        0,
      ),
    );
    this.camera.setTarget(target);
  }
}
