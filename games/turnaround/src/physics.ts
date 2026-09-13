import "@babylonjs/core/Physics/physicsEngineComponent";
import HavokPhysics from "@babylonjs/havok";
import wasmUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsBody } from "@babylonjs/core/Physics/v2/physicsBody";
import {
  PhysicsMotionType,
  PhysicsShapeType,
} from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import {
  PhysicsShapeBox,
  PhysicsShapeContainer,
} from "@babylonjs/core/Physics/v2/physicsShape";
import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { assertConstructionActive } from "../../../shared/scene-construction.js";

// Same engine and impulse-chassis contract as Forklift, owned by this workspace.
// The root build gives every consumer of this package one cacheable WASM URL.
let havok: ReturnType<typeof HavokPhysics> | undefined;
export async function enablePhysics(scene: Scene) {
  havok ??= HavokPhysics({ locateFile: () => wasmUrl }).catch((error) => {
    havok = undefined;
    throw error;
  });
  const module = await havok;
  assertConstructionActive(() => scene.isDisposed);
  const plugin = new HavokPlugin(true, module);
  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  scene.getPhysicsEngine()!.setSubTimeStep(1000 / 120);
  return plugin;
}
export function rigid(mesh: Mesh, mass = 0, friction = 0.65) {
  return new PhysicsAggregate(
    mesh,
    PhysicsShapeType.BOX,
    { mass, friction, restitution: 0.025 },
    mesh.getScene(),
  ).body;
}
export type ColliderPart = { size: number[]; position: number[]; rotation?: number };
/** One reusable box per owned compound; lifting updates child transforms, not meshes. */
export class CompoundCollider {
  readonly shape: PhysicsShapeContainer;
  private box: PhysicsShapeBox;
  private position = Vector3.Zero();
  private scale = Vector3.One();
  private rotation = Quaternion.Identity();
  constructor(scene: Scene, friction = 0.04) {
    this.shape = new PhysicsShapeContainer(scene);
    this.box = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), Vector3.One(), scene);
    this.box.material = this.shape.material = { friction, restitution: 0.01 };
  }
  update(parts: ColliderPart[]) {
    while (this.shape.getNumChildren()) this.shape.removeChild(this.shape.getNumChildren() - 1);
    for (const part of parts) {
      this.position.copyFromFloats(part.position[0], part.position[1], part.position[2]);
      this.scale.copyFromFloats(part.size[0], part.size[1], part.size[2]);
      Quaternion.RotationYawPitchRollToRef(0, part.rotation ?? 0, 0, this.rotation);
      this.shape.addChild(this.box, this.position, this.rotation, this.scale);
    }
  }
  dispose() { this.shape.dispose(); this.box.dispose(); }
}
export function compoundBody(root: TransformNode, parts: ColliderPart[], mass: number, friction = 0.04) {
  const collider = new CompoundCollider(root.getScene(), friction);
  collider.update(parts);
  const body = new PhysicsBody(root, PhysicsMotionType.DYNAMIC, false, root.getScene());
  body.shape = collider.shape;
  body.setMassProperties({ mass });
  body.setAngularDamping(0.7);
  body.setLinearDamping(0.05);
  root.onDisposeObservable.add(() => collider.dispose());
  return body;
}
