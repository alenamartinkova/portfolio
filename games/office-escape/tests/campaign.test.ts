import { describe, expect, it } from 'vitest';
import { atExit, officeLevels, resolveOfficeLevel } from '../src/world/levels';
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
    const route = [...level.route, { ...level.exit, w: 5, d: 4 }];
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1], b = route[i];
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

it('mixes compact loops, tall climbs, descending routes and narrow bridges', () => {
  const shaft = resolveOfficeLevel('accounts').route;
  expect(Math.max(...shaft.map(s => s.y)) - Math.min(...shaft.map(s => s.y))).toBeGreaterThan(20);
  expect(Math.max(...shaft.map(s => s.z)) - Math.min(...shaft.map(s => s.z))).toBeLessThan(15);
  expect(shaft.some((s, i) => shaft.slice(i + 1).some(b => b.x === s.x && b.z === s.z && b.y - s.y > 6))).toBe(true);
  const descent = resolveOfficeLevel('night-shift').route;
  expect(descent[0].y - descent.at(-1)!.y).toBeGreaterThan(12);
  for (const id of ['reception', 'rolling-stock', 'security-training', 'archive', 'executive', 'lockdown', 'last-out']) {
    const route = resolveOfficeLevel(id).route;
    expect(route.some((s, i) => i > 0 && s.z < route[i - 1].z || i > 0 && s.x < route[i - 1].x)).toBe(true);
  }
  expect(resolveOfficeLevel('executive').route.some(s => s.kind === 'beam' && s.w < 1.5)).toBe(true);
});

it('rotates security collision with lateral, diagonal and reverse crossings', () => {
  for (const yaw of [Math.PI / 2, -Math.PI / 2, Math.PI, Math.PI / 4]) {
    const gate = { x: 7, y: 12, z: -4, width: 3, yaw };
    const world = (x: number, z: number, y = 14) => ({ x: gate.x + x * Math.cos(yaw) + z * Math.sin(yaw), y, z: gate.z - x * Math.sin(yaw) + z * Math.cos(yaw) });
    expect(crossesGate(world(0, -2), world(0, 2), gate)).toBe(true);
    expect(crossesGate(world(0, 2), world(0, -2), gate)).toBe(true);
    expect(crossesGate(world(4, -2), world(4, 2), gate)).toBe(false);
    expect(crossesGate(world(0, -2, 3), world(0, 2, 3), gate)).toBe(false);
  }
});

it('requires a landed exit at the correct storey', () => {
  for (const level of officeLevels) {
    const p = { ...level.exit, y: level.exit.y + PLAYER_HEIGHT / 2 };
    expect(atExit(level, p, true)).toBe(true);
    expect(atExit(level, p, false)).toBe(false);
    expect(atExit(level, { ...p, y: p.y - 5 }, true)).toBe(false);
    expect(atExit(level, { ...p, x: p.x + 3 }, true)).toBe(false);
  }
});

it('keeps repeated shaft coordinates distinct when saving checkpoints', () => {
  const level = resolveOfficeLevel('accounts'), checkpoints = new CheckpointManager(level.route);
  const start = level.route[0], upper = checkpoints.stops[2];
  expect(checkpoints.update(new Vector3(start.x, start.y + PLAYER_HEIGHT / 2, start.z), true)).toBe(false);
  expect(checkpoints.update(new Vector3(upper.x, upper.y + PLAYER_HEIGHT / 2, upper.z), false)).toBe(false);
  expect(checkpoints.update(new Vector3(upper.x, upper.y + PLAYER_HEIGHT / 2, upper.z), true)).toBe(true);
  expect(checkpoints.spawn.y).toBeCloseTo(upper.y + PLAYER_HEIGHT / 2 + .09);
});
