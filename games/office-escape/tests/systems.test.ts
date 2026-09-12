import { describe, it, expect } from 'vitest';
import { FloorDetectionSystem } from '../src/systems/FloorDetectionSystem';
import { RunManager, formatTime } from '../src/systems/RunManager';
import { CheckpointManager } from '../src/systems/CheckpointManager';
import { Vector3 } from '@babylonjs/core';
import { route } from '../src/world/Level';
import { PLAYER_HEIGHT } from '../src/player/PlayerController';
describe('floor contact and recovery', () => {
    it('latches even one confirmed contact until recovery, regardless of the next jump', () => {
        const floor = new FloorDetectionSystem();
        expect(floor.update(false)).toBe(false);
        expect(floor.update(true)).toBe(true);
        expect(floor.update(false)).toBe(true);
        floor.reset();
        expect(floor.update(false)).toBe(false);
    });
    it('recovers immediately below the world', () => { expect(new FloorDetectionSystem().update(false, true)).toBe(true); });
});
describe('run lifecycle', () => {
    it('starts on movement, stops at exit, persists only improved best', () => { const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } }; const r = new RunManager(storage); r.update(10, false); expect(r.seconds).toBe(0); r.update(5, true); r.finish(); r.update(20, true); expect(r.seconds).toBe(5); r.reset(); r.update(8, true); r.finish(); expect(new RunManager(storage).best).toBe(5); expect(r.falls).toBe(0); });
    it('handles corrupt or blocked storage', () => { expect(new RunManager({ getItem: () => '-4', setItem: () => { } }).best).toBeNull(); const r = new RunManager({ getItem: () => { throw Error(); }, setItem: () => { throw Error(); } }); r.update(12, true); expect(() => r.finish()).not.toThrow(); expect(r.best).toBe(12); });
    it('formats milliseconds and minutes', () => { expect(formatTime(102.523)).toBe('01:42.523'); });
});
describe('checkpoints', () => {
    it('requires landing on a checkpoint, preserves forward progress, resets spawn height', () => { const c = new CheckpointManager(); const s = route.find(s => s.checkpoint === 2)!; const p = new Vector3(s.x, s.y + PLAYER_HEIGHT / 2 + .05, s.z); expect(c.update(p, false)).toBe(false); expect(c.update(p, true)).toBe(true); expect(c.current).toBe(2); expect(c.update(new Vector3(0, 2.3, 0), true)).toBe(false); expect(c.spawn.y).toBeCloseTo(s.y + PLAYER_HEIGHT / 2 + .09); });
});
