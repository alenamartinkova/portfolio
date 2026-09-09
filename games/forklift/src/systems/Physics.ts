import HavokPhysics from "@babylonjs/havok";
import wasmUrl from "@babylonjs/havok/lib/esm/HavokPhysics.wasm?url";
import {
  HavokPlugin,
  Mesh,
  PhysicsAggregate,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeContainer,
  PhysicsShapeType,
  Quaternion,
  Scene,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
let havok: ReturnType<typeof HavokPhysics> | undefined;
export async function enablePhysics(scene: Scene) {
  havok ??= HavokPhysics({ locateFile: () => wasmUrl });
  const plugin = new HavokPlugin(true, await havok);
  scene.enablePhysics(new Vector3(0, -9.81, 0), plugin);
  scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  scene.getPhysicsEngine()!.setSubTimeStep(1000 / 120);
  return plugin;
}
export function rigid(mesh: Mesh, mass = 0, friction = 0.65) {
  const a = new PhysicsAggregate(
    mesh,
    PhysicsShapeType.BOX,
    { mass, friction, restitution: 0.025 },
    mesh.getScene(),
  );
  if (mass) {
    a.body.setLinearDamping(0.15);
    a.body.setAngularDamping(0.5);
  }
  return a.body;
}
export interface BoxShape {
  size: number[];
  position: number[];
}
export function compoundBody(
  root: TransformNode,
  parts: BoxShape[],
  mass: number,
  animated = false,
  friction = 0.8,
  group = 1,
  mask = 0xffffffff,
) {
  const shape = new PhysicsShapeContainer(root.getScene());
  for (const p of parts) {
    const child = new PhysicsShapeBox(
      Vector3.Zero(),
      Quaternion.Identity(),
      Vector3.FromArray(p.size),
      root.getScene(),
    );
    child.material = { friction, restitution: 0.01 };
    child.filterMembershipMask = group;
    child.filterCollideMask = mask;
    shape.addChild(child, Vector3.FromArray(p.position));
  }
  shape.material = { friction, restitution: 0.01 };
  const body = new PhysicsBody(
    root,
    animated ? PhysicsMotionType.ANIMATED : PhysicsMotionType.DYNAMIC,
    false,
    root.getScene(),
  );
  body.shape = shape;
  body.setMassProperties({ mass });
  body.setAngularDamping(0.7);
  body.setLinearDamping(0.05);
  return body;
}
