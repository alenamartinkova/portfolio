import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Factory } from './Factory';

/** Scene-owned plant templates. Only decoration is merged; pots keep independent bodies. */
export class PlantModels {
    private pot?: Mesh;
    private details: Mesh[] = [];

    constructor(private factory: Factory) {
        factory.scene.onDisposeObservable.addOnce(() => {
            this.pot = undefined;
            this.details.length = 0;
        });
    }

    *create(x: number, z: number): Generator<void, Mesh, unknown> {
        const f = this.factory;
        let pot: Mesh;
        if (this.pot) {
            // Visible, pickable Mesh bounds remain exactly the original collider bounds.
            pot = new Mesh('ceramic plant pot', f.scene);
            this.pot.geometry!.applyToMesh(pot);
            pot.material = this.pot.material;
            pot.isPickable = false;
        } else {
            pot = f.cylinder('ceramic plant pot', .72, .65, [0, 0, 0], '#b89b7d');
            this.pot = pot;
        }
        pot.position.set(x, .325, z);
        yield;

        if (this.details.length) {
            for (const source of this.details) {
                const detail = new InstancedMesh(source.name, source);
                detail.parent = pot;
                detail.position.copyFrom(source.position);
                detail.isPickable = false;
                yield;
            }
        } else {
            // Build in pot-local coordinates before parenting, so merging never bakes
            // the first pot's world position into every later plant.
            const rim = f.cylinder('planter rim', .76, .065, [0, .29, 0], '#c8b395');
            rim.parent = pot;
            this.details.push(rim);
            yield;
            const soil = f.cylinder('potting soil', .64, .02, [0, .326, 0], '#514637');
            soil.parent = pot;
            this.details.push(soil);
            yield;
            const stems: Mesh[] = [], lightLeaves: Mesh[] = [], darkLeaves: Mesh[] = [];
            for (let i = 0; i < 9; i++) {
                const a = i * 2.4, h = .7 + (i % 3) * .27;
                const leafX = Math.sin(a) * .3, leafZ = Math.cos(a) * .3;
                stems.push(f.tube('plant stem', [[0, .32, 0], [leafX * .35, h * .7, leafZ * .35], [leafX, h, leafZ]], .017, '#476747'));
                yield;
                const leaf = f.sphere('broad leaf', [.32, .66, .047], [leafX, h + .13, leafZ], i % 2 ? '#497256' : '#6c9065');
                leaf.rotation.set(.35, a, Math.sin(a) * .55);
                (i % 2 ? darkLeaves : lightLeaves).push(leaf);
                yield;
            }
            for (const parts of [stems, lightLeaves, darkLeaves]) {
                const name = parts[0].name, receiveShadows = parts[0].receiveShadows;
                // MergeMeshes transforms normals with the position matrix. Flattened
                // leaves need inverse-transpose normals, matching their original shader.
                const normals: number[] = [];
                for (const part of parts) {
                    const normalMatrix = part.computeWorldMatrix(true).clone().invert().transpose();
                    const original = part.getVerticesData(VertexBuffer.NormalKind)!;
                    for (let i = 0; i < original.length; i += 3) {
                        const normal = Vector3.TransformNormal(Vector3.FromArray(original, i), normalMatrix).normalize();
                        normals.push(normal.x, normal.y, normal.z);
                    }
                    yield;
                }
                const merged = Mesh.MergeMeshes(parts, true, true)!;
                merged.setVerticesData(VertexBuffer.NormalKind, normals);
                merged.name = name;
                merged.isPickable = false;
                merged.receiveShadows = receiveShadows;
                merged.parent = pot;
                this.details.push(merged);
                yield;
            }
        }
        return pot;
    }
}
