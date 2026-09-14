import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Factory } from './Factory';

/** Immutable visual geometry, with one independent Mesh for each physics body.
 * Sources remain alive for the warehouse's entire scene, including damaged crates.
 */
export class CrateModels {
  private bodies = new Map<number, Mesh>();
  private details = new Map<string, Mesh>();

  constructor(private factory: Factory) {
    factory.scene.onDisposeObservable.addOnce(() => {
      this.bodies.clear();
      this.details.clear();
    });
  }

  create(size: number, position: number[]) {
    const f = this.factory, source = this.bodies.get(size);
    let body: Mesh;
    if (source) {
      // Keep the original bounds/geometry for Havok and property bookkeeping.
      // A visible instance follows this body's pose without a per-frame copier.
      body = new Mesh('carton', f.scene);
      source.geometry!.applyToMesh(body);
      body.material = source.material;
      body.receiveShadows = true;
      body.isVisible = false;
      const visual = new InstancedMesh('carton visual', source);
      visual.parent = body;
      visual.position.setAll(0);
      visual.rotation.setAll(0);
      visual.rotationQuaternion = null;
      visual.scaling.setAll(1);
    } else {
      body = f.box('carton', [size, size, size], [0, 0, 0], '#bc966c');
      this.bodies.set(size, body);
    }
    body.position.set(position[0], position[1], position[2]);
    this.place(`seam:${size}`, () => f.box('carton top seam', [size * .93, .004, .012], [0, 0, 0], '#8b6c49'), [0, size / 2 + .003, 0], body);
    this.place(`flap:${size}`, () => f.box('carton folded flap', [size * .46, .006, size * .93], [0, 0, 0], '#c49e72'), [-size * .24, size / 2 - .001, 0], body);
    this.place(`tape:${size}`, () => f.box('packing tape', [.18, size + .008, size + .008], [0, 0, 0], '#e0c7a0'), [0, 0, 0], body);
    this.place('arrows', () => f.label('↑ ↑', .38, .24, [0, 0, 0], '#594b3d', '#bc966c'), [.18, 0, -size / 2 - .006], body);
    return body;
  }

  private place(key: string, create: () => Mesh, position: number[], parent: Mesh) {
    const source = this.details.get(key);
    const mesh = source ? new InstancedMesh(source.name, source) : create();
    if (!source) this.details.set(key, mesh as Mesh);
    mesh.isPickable = source?.isPickable ?? mesh.isPickable;
    mesh.position.set(position[0], position[1], position[2]);
    mesh.parent = parent;
    return mesh;
  }
}
