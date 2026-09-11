import { describe, expect, it } from 'vitest';
import { officeLevels, resolveOfficeLevel } from '../src/world/levels';
import { crossesGate, gateState, SecuritySystem } from '../src/systems/SecuritySystem';
import { RunManager } from '../src/systems/RunManager';
import { CheckpointManager } from '../src/systems/CheckpointManager';
import { PLAYER_HEIGHT, SPRINT_SPEED, JUMP_SPEED, GRAVITY } from '../src/player/PlayerController';
import { Vector3, NullEngine, Scene, MeshBuilder } from '@babylonjs/core';
import { Factory } from '../src/world/Factory';

it('has ten distinct routes, valid checkpoints, and physically reachable jumps', () => {
  expect(officeLevels).toHaveLength(10);
  expect(new Set(officeLevels.map(l => l.id)).size).toBe(10);
  expect(new Set(officeLevels.map(l => JSON.stringify(l.route))).size).toBe(10);
  expect(resolveOfficeLevel('missing')).toBe(officeLevels[0]);
  for (const level of officeLevels) {
    expect(new CheckpointManager(level.route).stops).toHaveLength(4);
    for (const index of level.cards) expect(level.route[index].checkpoint).toBeDefined();
    for (let i = 1; i < level.route.length; i++) {
      const a = level.route[i - 1], b = level.route[i];
      // Measure edge-to-edge clearance with a capsule margin, using the actual jump constants.
      const dx = Math.max(0, Math.abs(a.x - b.x) - (a.w + b.w) / 2 + .6);
      const dz = Math.max(0, Math.abs(a.z - b.z) - (a.d + b.d) / 2 + .6);
      const airTime = (JUMP_SPEED + Math.sqrt(JUMP_SPEED ** 2 - 2 * GRAVITY * (b.y - a.y))) / GRAVITY;
      expect(Math.hypot(dx, dz), `${level.id}: ${i}`).toBeLessThan(SPRINT_SPEED * airTime * .9);
    }
  }
});
describe('security timing and collision', () => {
  const gate = { after: 7, period: 6, active: 2, phase: 0 };
  it('offers a full green crossing window and warns before reactivation', () => {
    expect(gateState(gate, 1).active).toBe(true);
    expect(gateState(gate, 2)).toEqual({ active: false, warning: false, safeFor: 4 });
    expect(gateState(gate, 5.5).warning).toBe(true);
    expect(gateState(gate, 6).active).toBe(true);
    expect(gateState({ ...gate, phase: 3 }, 1).active).toBe(false);
  });
  it('detects swept crossings in either direction but permits safe bypasses', () => {
    const p = { x: 0, y: 1.4, z: 10, width: 5 };
    expect(crossesGate({ x: 0, y: 3, z: 9 }, { x: 0, y: 3, z: 11 }, p)).toBe(true);
    expect(crossesGate({ x: 0, y: 3, z: 11 }, { x: 0, y: 3, z: 9 }, p)).toBe(true);
    expect(crossesGate({ x: 8, y: 3, z: 9 }, { x: 8, y: 3, z: 11 }, p)).toBe(false);
    expect(crossesGate({ x: 0, y: 3, z: 8 }, { x: 0, y: 3, z: 9 }, p)).toBe(false);
  });
});
class HeadlessFactory extends Factory {
  override label() { return MeshBuilder.CreatePlane('label', { size: .01 }, this.scene); }
}
it('collects cards only on landing, guards checkpoints and resets a new run', () => {
  const engine = new NullEngine(), scene = new Scene(engine);
  try {
    const level = officeLevels[5], system = new SecuritySystem(new HeadlessFactory(scene), level);
    const checkpoint = new CheckpointManager(level.route);
    const stop = level.route[level.cards[0]];
    const p = new Vector3(stop.x, stop.y + PLAYER_HEIGHT / 2, stop.z);
    expect(system.complete).toBe(false);
    expect(system.update(0, p, p, false)).toBeUndefined();
    expect(checkpoint.update(p, true, n => system.canSaveCheckpoint(n))).toBe(false);
    expect(system.update(0, p, p, true)).toBe('cardCollected');
    expect(checkpoint.update(p, true, n => system.canSaveCheckpoint(n))).toBe(true);
    expect(system.update(0, p, p, true)).toBeUndefined();
    for (const index of level.cards.slice(1)) {
      const s = level.route[index], p = new Vector3(s.x, s.y + PLAYER_HEIGHT / 2, s.z);
      system.update(0, p, p, true);
    }
    expect(system.complete).toBe(true);
    system.reset(); expect(system.complete).toBe(false); expect(system.seconds).toBe(0);
  } finally { scene.dispose(); engine.dispose(); }
});
it('keeps Office Escape best times separate for every level', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const a = new RunManager(storage, 'first-evening'); a.update(50, true); a.finish();
  expect(new RunManager(storage, 'first-evening').best).toBe(50);
  expect(new RunManager(storage, 'last-out').best).toBeNull();
});
