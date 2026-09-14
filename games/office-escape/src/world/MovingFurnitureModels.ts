import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Factory } from './Factory';

type Kind = 'chair' | 'cart';

/** Authored decoration in hull-local coordinates. Each yield bounds construction work. */
export function* movingFurnitureParts(f: Factory, kind: Kind, w: number, height: number, d: number): Generator<Mesh> {
    yield f.box(kind, [w, .18, d], [0, height / 2 - .09, 0], '#d9975e');
    if (kind === 'chair') {
        yield f.cylinder('gas lift pedestal', .12, height - .3, [0, -.05, 0], '#a5b0ac');
        yield f.cylinder('pedestal sleeve', .2, height * .42, [0, -height * .2, 0], '#3a4548');
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5, x = Math.sin(a) * w * .38, z = Math.cos(a) * d * .38;
            yield f.tube('chair wheel spoke', [[0, -height / 2 + .25, 0], [x * .7, -height / 2 + .2, z * .7], [x, -height / 2 + .18, z]], .045, '#89948f');
            const wheel = f.cylinder('rubber caster', .19, .14, [x, -height / 2 + .11, z], '#2d3437');
            wheel.rotation.z = Math.PI / 2;
            yield wheel;
        }
        yield f.tube('chair back support', [[0, height / 2 - .2, d * .3], [0, height / 2 + .3, d * .45], [0, height / 2 + .55, d * .45]], .055, '#4d5756');
        const back = f.box('chair back cushion', [w * .92, .72, .22], [0, height / 2 + .38, d * .44], '#b97a50');
        back.rotation.x = -.12;
        yield back;
        for (const side of [-1, 1]) {
            yield f.tube('armrest frame', [[side * w * .39, height / 2 - .1, 0], [side * w * .44, height / 2 + .22, .08]], .038, '#53605d');
            yield f.box('armrest pad', [.12, .07, d * .45], [side * w * .44, height / 2 + .25, .03], '#3a4243');
        }
    } else {
        for (const x of [-w * .4, w * .4]) for (const z of [-d * .4, d * .4]) {
            yield f.cylinder('cart upright', .06, height - .2, [x, 0, z], '#718983');
            const wheel = f.cylinder('rubber caster', .22, .15, [x, -height / 2 + .13, z], '#293c40');
            wheel.rotation.z = Math.PI / 2;
            yield wheel;
        }
        yield f.box('bottom cart shelf', [w, .1, d], [0, -height / 2 + .35, 0], '#709087');
        for (const side of [-1, 1]) {
            yield f.tube('cart handle', [[side * w * .44, height / 2, -.35], [side * w * .44, height / 2 + .2, -.35], [side * w * .44, height / 2 + .2, .35], [side * w * .44, height / 2, .35]], .035, '#9caaa1');
        }
    }
}

/** Sources and their moving hulls live until scene retirement, including after reset. */
export class MovingFurnitureModels {
    private templates = new Map<string, Mesh[]>();

    constructor(private factory: Factory) {
        factory.scene.onDisposeObservable.addOnce(() => this.templates.clear());
    }

    *attach(hull: Mesh, kind: Kind, w: number, height: number, d: number): Generator<void> {
        const key = JSON.stringify([kind, w, height, d]), cached = this.templates.get(key);
        if (cached) {
            for (const source of cached) {
                const instance = new InstancedMesh(source.name, source);
                instance.parent = hull;
                instance.position.copyFrom(source.position);
                instance.rotation.copyFrom(source.rotation);
                instance.isPickable = false;
                yield;
            }
            return;
        }
        const groups = new Map<string, Mesh[]>();
        for (const part of movingFurnitureParts(this.factory, kind, w, height, d)) {
            const groupKey = `${part.material!.uniqueId}:${part.receiveShadows}`;
            const group = groups.get(groupKey) ?? [];
            group.push(part);
            groups.set(groupKey, group);
            yield;
        }
        const sources: Mesh[] = [];
        for (const parts of groups.values()) {
            const first = parts[0], name = first.name, receiveShadows = first.receiveShadows;
            // All authored parts have unit scale; rotations preserve their normals.
            const source = parts.length === 1 ? first : Mesh.MergeMeshes(parts, true, true)!;
            source.name = name;
            source.receiveShadows = receiveShadows;
            source.isPickable = false;
            source.parent = hull;
            sources.push(source);
            yield;
        }
        // Bound retention for tooling/custom dimensions; uncached meshes stay scene-owned.
        if (this.templates.size < 64) this.templates.set(key, sources);
    }
}
