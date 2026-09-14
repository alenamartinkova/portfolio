import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Factory } from './Factory';

type RackPart = 'rack foot plate' | 'rack foot protector' | 'rack mounting slot' | 'orange rack beam' | 'rack diagonal brace';

/** Scene-owned visual templates. Each copy follows its own breakable parent and
 * keeps individual culling; physics bodies and camera obstacles stay independent.
 * The first visible copy owns the geometry until the entire scene is disposed.
 */
export class RackModels {
  private sources = new Map<RackPart, Mesh>();

  constructor(private factory: Factory) {
    factory.scene.onDisposeObservable.addOnce(() => this.sources.clear());
  }

  place(kind: RackPart, position: readonly number[], parent: TransformNode) {
    const source = this.sources.get(kind);
    const mesh = source ? new InstancedMesh(kind, source) : this.create(kind);
    if (!source) this.sources.set(kind, mesh as Mesh);
    // Instances copy the source's current local transform. Reset it before
    // attaching to a different upright/deck, including opposite diagonal braces.
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.setAll(0);
    mesh.parent = parent;
    return mesh;
  }

  private create(kind: RackPart) {
    const f = this.factory, origin = [0, 0, 0];
    switch (kind) {
      case 'rack foot plate': return f.beveledBox(kind, [.34, .06, .32], origin, '#60757c');
      case 'rack foot protector': return f.beveledBox(kind, [.21, .45, .21], origin, '#d8a849');
      case 'rack mounting slot': return f.box(kind, [.032, .065, .006], origin, '#1e343c');
      case 'orange rack beam': return f.box(kind, [4.5, .23, .1], origin, '#cf7c3e');
      case 'rack diagonal brace': return f.cylinder(kind, .045, Math.hypot(1.8, 1.65), origin, '#71868b');
    }
  }
}
