import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import HavokPhysics from '@babylonjs/havok';
import { FreeCamera, Frustum, HavokPlugin, Mesh, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { finishConstruction } from '../../../shared/scene-construction.js';
import { Factory } from '../src/world/Factory';
import { PlantModels } from '../src/world/PlantModels';
import { PhysicsInteractionSystem } from '../src/systems/PhysicsInteractionSystem';

let havok: Awaited<ReturnType<typeof HavokPhysics>>;
beforeAll(async () => {
    havok = await HavokPhysics({ wasmBinary: Uint8Array.from(readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))).buffer });
});

it('retains authored plant geometry, materials and shadow flags after local merging', () => {
    const engine = new NullEngine(), scene = new Scene(engine), f = new Factory(scene);
    try {
        // Original authored decoration is the reference for transformed vertex geometry.
        const reference: Mesh[] = [
            f.cylinder('planter rim', .76, .065, [0, .29, 0], '#c8b395'),
            f.cylinder('potting soil', .64, .02, [0, .326, 0], '#514637'),
        ];
        for (let i = 0; i < 9; i++) {
            const a = i * 2.4, h = .7 + (i % 3) * .27, x = Math.sin(a) * .3, z = Math.cos(a) * .3;
            reference.push(f.tube('plant stem', [[0, .32, 0], [x * .35, h * .7, z * .35], [x, h, z]], .017, '#476747'));
            const leaf = f.sphere('broad leaf', [.32, .66, .047], [x, h + .13, z], i % 2 ? '#497256' : '#6c9065');
            leaf.rotation.set(.35, a, Math.sin(a) * .55);
            reference.push(leaf);
        }
        const triangles = (meshes: Mesh[]) => {
            const result: string[] = [];
            for (const mesh of meshes) {
                const world = mesh.computeWorldMatrix(true), positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
                const normalMatrix = world.clone().invert().transpose(), normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
                const indices = mesh.getIndices()!;
                for (let i = 0; i < indices.length; i += 3) {
                    const points = Array.from({ length: 3 }, (_, corner) => {
                        const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, indices[i + corner] * 3), world);
                        const n = Vector3.TransformNormal(Vector3.FromArray(normals, indices[i + corner] * 3), normalMatrix).normalize();
                        return [...p.asArray(), ...n.asArray()].map(v => Math.round(v * 10000)).join(',');
                    });
                    result.push(`${mesh.material!.uniqueId}:${mesh.receiveShadows}:${points.join(';')}`);
                }
            }
            return result.sort();
        };
        const expected = triangles(reference);
        const models = new PlantModels(f), first = finishConstruction(models.create(12, 15));
        first.position.setAll(0);
        const actual = first.getChildMeshes() as Mesh[];
        expect(actual).toHaveLength(5);
        expect(triangles(actual)).toEqual(expected);
        const second = finishConstruction(models.create(-8, 24));
        expect(second.geometry).toBe(first.geometry);
        expect(second.getBoundingInfo().boundingBox.extendSize.asArray()).toEqual(first.getBoundingInfo().boundingBox.extendSize.asArray());
        for (const detail of second.getChildMeshes()) {
            expect(detail.isPickable).toBe(false);
            expect(detail.getTotalIndices()).toBeGreaterThan(0);
        }
        const camera = new FreeCamera('near second plant', new Vector3(-8, 1.5, 21), scene);
        camera.setTarget(new Vector3(-8, 1, 24));
        const planes = Frustum.GetPlanes(camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true)));
        for (const detail of first.getChildMeshes()) {
            detail.computeWorldMatrix(true);
            expect(detail.isInFrustum(planes)).toBe(false);
        }
        for (const detail of second.getChildMeshes()) {
            detail.computeWorldMatrix(true);
            expect(detail.isInFrustum(planes)).toBe(true);
        }
    } finally { scene.dispose(); engine.dispose(); }
});

it('keeps independent 8 kg bodies and moving decoration through impulses, reset and disposal', () => {
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
        scene.enablePhysics(Vector3.Zero(), new HavokPlugin(true, havok));
        const physics = new PhysicsInteractionSystem(scene), models = new PlantModels(new Factory(scene));
        const first = finishConstruction(models.create(0, 0)), second = finishConstruction(models.create(4, 0));
        const a = physics.rigid(first, 8, 'potted plant'), b = physics.rigid(second, 8, 'potted plant');
        expect(a.body).not.toBe(b.body);
        expect(a.body.getMassProperties().mass).toBe(8);
        expect(b.body.getMassProperties().mass).toBe(8);
        expect(first.isVisible && first.isPickable && second.isVisible && second.isPickable).toBe(true);
        const step = () => {
            scene.incrementRenderId();
            for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
            scene.getPhysicsEngine()!._step(1 / 60);
        };
        step();
        b.body.applyImpulse(new Vector3(6, 0, 0), second.position.add(new Vector3(0, .25, 0)));
        for (let i = 0; i < 30; i++) step();
        expect(first.position.x).toBeCloseTo(0, 5);
        expect(second.position.x).toBeGreaterThan(4.1);
        expect(Math.abs(second.rotationQuaternion!.z)).toBeGreaterThan(.01);
        for (const pot of [first, second]) for (const detail of pot.getChildMeshes()) {
            const expected = Vector3.TransformCoordinates(detail.position, pot.computeWorldMatrix(true));
            detail.computeWorldMatrix(true);
            expect(Vector3.Distance(detail.absolutePosition, expected)).toBeLessThan(.00001);
        }
        physics.toggle(second.position);
        expect(physics.grabbed?.mesh).toBe(second);
        physics.reset();
        step();
        expect(physics.grabbed).toBeNull();
        expect(second.position.x).toBeCloseTo(4, 5);
        const geometry = first.geometry!, details = [...first.getChildMeshes(), ...second.getChildMeshes()];
        scene.dispose();
        expect(geometry.isDisposed()).toBe(true);
        expect(details.every(mesh => mesh.isDisposed())).toBe(true);
        expect(scene.meshes).toHaveLength(0);
    } finally { if (!scene.isDisposed) scene.dispose(); engine.dispose(); }
});
