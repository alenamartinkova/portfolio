import { beforeAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { Factory } from '../src/world/Factory';
import { PlayerController, PLAYER_HEIGHT } from '../src/player/PlayerController';
import { PhysicsInteractionSystem } from '../src/systems/PhysicsInteractionSystem';
import { FloorDetectionSystem } from '../src/systems/FloorDetectionSystem';
import type { Input } from '../src/systems/Input';

let havok: Awaited<ReturnType<typeof HavokPhysics>>;
beforeAll(async () => {
    havok = await HavokPhysics({ wasmBinary: Uint8Array.from(readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))).buffer });
});

function rig(safePlatform = false) {
    const engine = new NullEngine(), scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -18, 0), new HavokPlugin(true, havok));
    const physics = new PhysicsInteractionSystem(scene);
    const ground = MeshBuilder.CreateBox('lava', { width: 30, height: .4, depth: 30 }, scene);
    ground.position.y = -.2;
    physics.rigid(ground);
    ground.metadata.forbidden = true;
    if (safePlatform) {
        const table = MeshBuilder.CreateBox('safe table', { width: 4, height: .3, depth: 4 }, scene);
        table.position.y = 1.35;
        physics.rigid(table);
    }
    for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
    const player = new PlayerController(scene, new Factory(scene), new Vector3(0, 3.5, 0));
    const floor = new FloorDetectionSystem();
    const contacts: {feet: number; failed: boolean}[] = [];
    player.onGroundContact = (position, distance) => { const failed = floor.checkContact(scene, position, player.feet, distance); contacts.push({ feet: player.feet, failed }); return failed; };
    const jumps = vi.fn(), landings = vi.fn();
    player.onJump = jumps; player.onLand = landings;
    const keys = new Set<string>(), pressed = new Set<string>();
    const input = { keys, axis: (positive: string, negative: string) => Number(keys.has(positive)) - Number(keys.has(negative)), consume: (key: string) => { const value = pressed.has(key); pressed.delete(key); return value; } } as Input;
    return { scene, physics, player, floor, jumps, landings, keys, pressed, contacts,
        step(dt: number, spamJump: boolean) {
            if (spamJump) { pressed.add('Space'); keys.add('Space'); }
            player.update(dt, input, 0, false);
            const failed = floor.update(false, player.position.y < -3);
            scene.incrementRenderId();
            scene.getPhysicsEngine()!._step(dt);
            return failed;
        },
        dispose() { scene.dispose(); engine.dispose(); },
    };
}

for (const fps of [30, 60, 144]) {
    it(`cannot bunny-hop off lava with a jump buffered every frame at ${fps} FPS`, () => {
        const test = rig();
        try {
            let failed = false;
            for (let frame = 0; frame < fps * 3 && !failed; frame++) failed = test.step(1 / fps, true);
            expect(failed).toBe(true);
            expect(test.jumps, JSON.stringify(test.contacts)).not.toHaveBeenCalled();
            expect(test.floor.update(false), 'leaving the floor cannot erase a recorded contact').toBe(true);
            test.floor.reset();
            test.player.teleport(new Vector3(0, 3.5, 0));
            expect(test.floor.update(false)).toBe(false);
            expect(test.step(1 / fps, false)).toBe(false);
        } finally { test.dispose(); }
    });

    it(`still allows a buffered jump from safe furniture above lava at ${fps} FPS`, () => {
        const test = rig(true);
        try {
            for (let frame = 0; frame < fps * 2; frame++) expect(test.step(1 / fps, true)).toBe(false);
            expect(test.jumps).toHaveBeenCalled();
            expect(test.player.feet).toBeGreaterThan(1.4);
        } finally { test.dispose(); }
    });
}

it('does not treat airborne proximity as a confirmed floor contact', () => {
    const test = rig();
    try {
        test.player.teleport(new Vector3(0, PLAYER_HEIGHT / 2 + .12, 0));
        test.player.controller.setVelocity(new Vector3(0, 4, 0));
        expect(test.step(1 / 60, false)).toBe(false);
        expect(test.player.feet).toBeGreaterThan(.12);
    } finally { test.dispose(); }
});

it('cannot erase a lava landing by mantling onto a nearby low ledge in the same frame', () => {
    const test = rig();
    try {
        const ledge = MeshBuilder.CreateBox('low safe ledge', { width: 2, height: .6, depth: .6 }, test.scene);
        ledge.position.set(0, .3, .9);
        test.physics.rigid(ledge);
        ledge.computeWorldMatrix(true);
        test.player.teleport(new Vector3(0, PLAYER_HEIGHT / 2 + .05, 0));
        test.keys.add('KeyW');
        expect(test.step(1 / 60, true)).toBe(true);
        expect(test.player.feet).toBeLessThan(.2);
        expect(test.jumps).not.toHaveBeenCalled();
    } finally { test.dispose(); }
});
