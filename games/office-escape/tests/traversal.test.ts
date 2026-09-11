import { beforeAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, Scene, Vector3, FreeCamera } from '@babylonjs/core';
import { Factory } from '../src/world/Factory';
import { Level } from '../src/world/Level';
import { officeLevels } from '../src/world/levels';
import { PhysicsInteractionSystem, settlePhysics } from '../src/systems/PhysicsInteractionSystem';
import { CheckpointManager } from '../src/systems/CheckpointManager';
import { PlayerController } from '../src/player/PlayerController';
import { gateState } from '../src/systems/SecuritySystem';
import type { Input } from '../src/systems/Input';
let havok: Awaited<ReturnType<typeof HavokPhysics>>;
beforeAll(async () => {
  havok = await HavokPhysics({ wasmBinary: Uint8Array.from(readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))).buffer });
});
for (const definition of officeLevels) {
  it(`traverses ${definition.id} using actual jumps, furniture and security timing`, () => {
    const engine = new NullEngine(); const scene = new Scene(engine);
    const label = vi.spyOn(Factory.prototype, 'label').mockImplementation(function(this: Factory) { return MeshBuilder.CreatePlane('label', { size: .01 }, this.scene); });
    try {
      scene.enablePhysics(new Vector3(0, -18, 0), new HavokPlugin(true, havok));
      new FreeCamera('test camera', new Vector3(0, 8, -10), scene);
      const physics = new PhysicsInteractionSystem(scene), level = new Level(scene, physics, definition);
      const checkpoints = new CheckpointManager(definition.route);
      const player = new PlayerController(scene, level.f, checkpoints.spawn);
      const keys = new Set<string>(), pressed = new Set<string>();
      const input = { keys, pressed, axis: (p: string, n: string) => Number(keys.has(p)) - Number(keys.has(n)), consume: (key: string) => { const yes = pressed.has(key); pressed.delete(key); return yes; } } as Input;
      const stepPhysics = () => {
        scene.incrementRenderId();
        for (const mesh of scene.meshes) mesh.computeWorldMatrix(true);
        scene.getPhysicsEngine()!._step(1 / 60);
      };
      const render = vi.spyOn(scene, 'render');
      settlePhysics(scene);
      expect(render).not.toHaveBeenCalled();
      render.mockRestore();
      let target = 1, launched = false, jumped = false, complete = false;
      for (let frame = 0; frame < 120 * 60; frame++) {
        const s = definition.route[target] ?? { x: 3, z: 72.8 };
        const before = player.position.clone();
        const dx = s.x - before.x, dz = s.z - before.z, distance = Math.hypot(dx, dz);
        keys.clear();
        const gate = definition.gates.find(g => g.after === target - 1);
        const signal = gate ? gateState(gate, level.security.seconds) : undefined;
        const wait = !launched && player.grounded && signal && (signal.active || signal.safeFor < 1.4);
        if (!wait) {
          if (distance > .18) { keys.add('KeyW'); if (distance > 2.1) keys.add('ShiftLeft'); }
          if (!launched && player.grounded) { pressed.add('Space'); keys.add('Space'); launched = true; jumped = false; }
          if (launched) keys.add('Space');
        }
        player.update(1 / 60, input, Math.atan2(dx, dz), false);
        physics.update(1 / 60, player.position, player.forward);
        const event = level.security.update(1 / 60, before, player.position, player.grounded);
        expect(event, `${definition.id} beam at stop ${target}`).not.toBe('securityHit');
        expect(player.feet, `${definition.id} fell at stop ${target}: ${player.position}`).toBeGreaterThan(.2);
        if (!player.grounded) jumped = true;
        checkpoints.update(player.position, player.grounded, n => level.security.canSaveCheckpoint(n));
        if (distance < .62 && player.grounded && jumped) { target++; launched = false; }
        if (player.position.z > 71 && Math.abs(player.position.x - 3) < 2.5 && player.feet > 2.85 && player.grounded && level.security.complete) { complete = true; break; }
        stepPhysics();
      }
      expect(complete, `stuck at ${target}: ${player.position}`).toBe(true);
      expect(checkpoints.current).toBe(3);
    } finally { label.mockRestore(); scene.dispose(); engine.dispose(); }
  }, 20000);
}
