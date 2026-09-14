import { beforeAll, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import HavokPhysics from '@babylonjs/havok';
import { AbstractMesh, FreeCamera, Frustum, HavokPlugin, InstancedMesh, Mesh, NullEngine, Scene, Vector3, VertexBuffer } from '@babylonjs/core';
import { finishConstruction } from '../../../shared/scene-construction.js';
import { Factory } from '../src/world/Factory';
import { Level } from '../src/world/Level';
import { MovingFurnitureModels, movingFurnitureParts } from '../src/world/MovingFurnitureModels';
import { officeLevels } from '../src/world/levels';
import { PhysicsInteractionSystem } from '../src/systems/PhysicsInteractionSystem';

let havok: Awaited<ReturnType<typeof HavokPhysics>>;
beforeAll(async () => {
    havok = await HavokPhysics({ wasmBinary: Uint8Array.from(readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))).buffer });
});

function triangles(meshes: AbstractMesh[]) {
    const result: string[] = [];
    for (const mesh of meshes) {
        const world = mesh.computeWorldMatrix(true), normalMatrix = world.clone().invert().transpose();
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!, normals = mesh.getVerticesData(VertexBuffer.NormalKind)!;
        const uvs = mesh.getVerticesData(VertexBuffer.UVKind)!, indices = mesh.getIndices()!;
        for (let i = 0; i < indices.length; i += 3) {
            const corners = Array.from({ length: 3 }, (_, corner) => {
                const index = indices[i + corner];
                const p = Vector3.TransformCoordinates(Vector3.FromArray(positions, index * 3), world);
                const n = Vector3.TransformNormal(Vector3.FromArray(normals, index * 3), normalMatrix).normalize();
                return [...p.asArray(), ...n.asArray(), uvs[index * 2], uvs[index * 2 + 1]].map(v => Math.round(v * 10000)).join(',');
            });
            result.push(`${mesh.material!.uniqueId}:${mesh.receiveShadows}:${corners.join(';')}`);
        }
    }
    return result.sort();
}

for (const kind of ['chair', 'cart'] as const) {
    it(`${kind}: merging and instancing preserve triangles, normals, UVs and independent culling`, () => {
        const engine = new NullEngine(), scene = new Scene(engine), f = new Factory(scene);
        try {
            const models = new MovingFurnitureModels(f);
            for (const height of [1.3, 1.4]) {
                const raw = [...movingFurnitureParts(f, kind, 2.4, height, 2.4)];
                expect(raw).toHaveLength(kind === 'chair' ? 19 : 12);
                const expected = triangles(raw);
                const first = new Mesh('first hull', scene), second = new Mesh('second hull', scene);
                finishConstruction(models.attach(first, kind, 2.4, height, 2.4));
                finishConstruction(models.attach(second, kind, 2.4, height, 2.4));
                expect(first.getChildMeshes()).toHaveLength(kind === 'chair' ? 9 : 5);
                expect(triangles(first.getChildMeshes())).toEqual(expected);
                expect(triangles(second.getChildMeshes())).toEqual(expected);
                expect(second.getChildMeshes().every(m => m instanceof InstancedMesh && !m.isPickable)).toBe(true);
                first.position.set(40, 0, 30);
                const camera = new FreeCamera('close view', new Vector3(0, 1, -5), scene);
                camera.setTarget(Vector3.Zero());
                const planes = Frustum.GetPlanes(camera.getViewMatrix(true).multiply(camera.getProjectionMatrix(true)));
                for (const mesh of first.getChildMeshes()) { mesh.computeWorldMatrix(true); expect(mesh.isInFrustum(planes)).toBe(false); }
                for (const mesh of second.getChildMeshes()) { mesh.computeWorldMatrix(true); expect(mesh.isInFrustum(planes)).toBe(true); }
                const wider = new Mesh('wider hull', scene);
                finishConstruction(models.attach(wider, kind, 3.2, height, 2.4));
                expect(wider.getChildMeshes().every(m => !(m instanceof InstancedMesh))).toBe(true);
                raw.forEach(m => m.dispose());
                camera.dispose();
            }
        } finally { scene.dispose(); engine.dispose(); }
    });

    it(`${kind}: retains full-height collider, mass, moving visuals, dragging and reset above ground floor`, () => {
        const engine = new NullEngine(), scene = new Scene(engine);
        try {
            scene.enablePhysics(Vector3.Zero(), new HavokPlugin(true, havok));
            const physics = new PhysicsInteractionSystem(scene), level = new Level(scene, physics, officeLevels[0], true);
            level.f = new Factory(scene);
            const stop = { kind, x: 0, z: 0, y: 4.4, base: 3, w: 2.4, d: 2.4 };
            const first = level.furniture(stop), second = level.furniture({ ...stop, x: 6 });
            const [a, b] = physics.objects;
            expect(a.aggregate.body).not.toBe(b.aggregate.body);
            for (const object of [a, b]) {
                expect(object.aggregate.body.getMassProperties().mass).toBe(kind === 'chair' ? 12 : 28);
                expect(object.mesh.visibility).toBe(0);
                expect(object.mesh.isPickable).toBe(true);
                expect(object.mesh.position.y).toBeCloseTo(3.7);
                const bounds = object.mesh.getBoundingInfo().boundingBox.extendSize;
                expect(bounds.x).toBeCloseTo(1.2); expect(bounds.y).toBeCloseTo(.7); expect(bounds.z).toBeCloseTo(1.2);
                const top = object.mesh.getChildMeshes().find(m => m.name === kind)!;
                top.computeWorldMatrix(true);
                expect(top.getBoundingInfo().boundingBox.maximumWorld.y).toBeCloseTo(4.4);
            }
            const step = () => {
                scene.incrementRenderId();
                for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
                scene.getPhysicsEngine()!._step(1 / 60);
            };
            step();
            b.aggregate.body.applyImpulse(new Vector3(12, 0, 0), second.position.add(new Vector3(0, .5, 0)));
            for (let i = 0; i < 30; i++) step();
            expect(first.position.x).toBeCloseTo(0, 5);
            expect(second.position.x).toBeGreaterThan(6.1);
            expect(Math.abs(second.rotationQuaternion!.z)).toBeGreaterThan(.01);
            for (const mesh of second.getChildMeshes()) {
                const expected = Vector3.TransformCoordinates(mesh.position, second.computeWorldMatrix(true));
                mesh.computeWorldMatrix(true);
                expect(Vector3.Distance(mesh.absolutePosition, expected)).toBeLessThan(.00001);
            }
            physics.toggle(second.position);
            expect(physics.grabbed?.mesh).toBe(second);
            physics.reset(); step();
            expect(physics.grabbed).toBeNull();
            expect(second.position.x).toBeCloseTo(6, 5);
            const sources = first.getChildMeshes() as Mesh[], instances = second.getChildMeshes();
            const geometries = sources.map(m => m.geometry!);
            scene.dispose();
            expect([...sources, ...instances].every(m => m.isDisposed())).toBe(true);
            expect(geometries.every(g => g.isDisposed())).toBe(true);
            expect(scene.meshes).toHaveLength(0);
        } finally { if (!scene.isDisposed) scene.dispose(); engine.dispose(); }
    });
}
