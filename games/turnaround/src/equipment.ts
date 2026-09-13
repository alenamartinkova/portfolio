import type { ColliderPart } from "./physics";
import type { VehicleId } from "./core/operations";
import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { rigid } from "./physics";

export const STAIR_BASE = 0.3;
export const STAIR_STEPS = 12;
export function equipmentParts(id: VehicleId, height: number): ColliderPart[] {
  if (id === "crew") return [{ size: [0.5, 1.25, 0.5], position: [0, 0, 0] }];
  const long = id === "fuel" ? 4.8 : id === "stairs" ? 3.8 : 3;
  const parts: ColliderPart[] = [{ size: [1.95, 0.6, long], position: [0, -0.3, 0] }];
  if (id !== "stairs" && id !== "belt")
    parts.push({ size: [1.5, 1.05, 1.1], position: [0, 0.5, -long / 2 + 0.55] });
  if (id === "fuel" || id === "water")
    parts.push({ size: [1.65, 1.65, long - 1.2], position: [0, 0.65, 0.55] });
  if (id === "stairs") {
    for (let i = 0; i < STAIR_STEPS; i++) {
      const top = STAIR_BASE + (height - STAIR_BASE) * (i + 1) / STAIR_STEPS;
      parts.push({ size: [1.4, 0.12, 0.3], position: [0, top - 0.06 - 0.55, 1.6 - i * 0.3] });
    }
    parts.push({ size: [1.5, 0.14, 0.6], position: [0, height - 0.07 - 0.55, -1.95] });
    for (const side of [-1, 1]) {
      parts.push({ size: [0.06, 0.85, 0.6], position: [side * 0.72, height + 0.4 - 0.55, -1.95] });
      parts.push({ size: [0.07, 0.09, Math.hypot(3.6, height - STAIR_BASE)], position: [side * 0.72, STAIR_BASE + 0.88 * (height - STAIR_BASE) - 0.55, -0.05], rotation: Math.atan2(height - STAIR_BASE, 3.6) });
    }
  }
  if (id === "belt") {
    const rise = height - 0.55;
    parts.push({ size: [1.05, 0.22, Math.hypot(4, rise)], position: [0, (height + 0.55) / 2 - 0.55, -0.3], rotation: Math.atan2(rise, 4) });
  }
  if (id === "catering") {
    parts.push({ size: [1.8, 1.3, 2.5], position: [0, height + 0.6 - 0.55, 0.55] });
    parts.push({ size: [1.4, 0.12, 2.1], position: [0, height - 0.55, -2.4] });
  }
  if (id === "push") parts.push({ size: [2.3, 0.6, 3.3], position: [0, 0.25, 0] });
  return parts;
}

/** Fuselage, wings, engines, tail and landing gear in the authored aircraft frame. */
export const AIRCRAFT_PARTS: ColliderPart[] = [
  { size: [2.4, 2.6, 10], position: [0, 2.7, 0] },
  { size: [1.7, 2.1, 3], position: [0, 2.7, -6.5] },
  { size: [1.5, 1.8, 3], position: [0, 2.7, 6.5] },
  { size: [0.75, 1.1, 1.5], position: [0, 2.7, -8.2] },
  { size: [21.8, 0.35, 2.9], position: [0, 3.25, 1] },
  { size: [7.4, 0.23, 1.8], position: [0, 4.1, 6.6] },
  { size: [0.3, 3.4, 3], position: [0, 5.1, 6.4] },
  ...[-1, 1].flatMap(side => [
    { size: [1.15, 1.15, 3.8], position: [side * 4.2, 2.85, -0.2] },
    { size: [0.3, 3.5, 0.15], position: [side * 4.2, 2.85, -2.2] },
    { size: [3.5, 0.3, 0.15], position: [side * 4.2, 2.85, -2.2] },
    { size: [0.5, 1.7, 0.8], position: [side * 1, 0.85, 1.3] },
  ]),
  { size: [0.4, 1.8, 0.7], position: [0, 0.9, -5.8] },
];
export function buildAircraftColliders(scene: Scene) {
  return AIRCRAFT_PARTS.map(part => {
    const mesh = MeshBuilder.CreateBox("aircraft collider", { width: part.size[0], height: part.size[1], depth: part.size[2] }, scene);
    mesh.position.set(part.position[0], part.position[1], part.position[2]);
    mesh.isVisible = false;
    mesh.isPickable = false;
    mesh.metadata = { solid: true };
    const body = rigid(mesh);
    body.setCollisionCallbackEnabled(true);
    return mesh;
  });
}
