import { describe, expect, it } from 'vitest';
import { InspectionSystem } from '../src/systems/InspectionSystem';
import { levels } from '../src/missions/levels';
import { CampaignProgress, campaignStars } from '../../../shared/CampaignProgress';
import { en, sk } from '../src/i18n';
it('awards the time star only to clean runs, including exactly the par time', () => {
  expect(campaignStars(60, 90, false)).toBe(1);
  expect(campaignStars(100, 90, false)).toBe(1);
  expect(campaignStars(100, 90, true)).toBe(2);
  expect(campaignStars(90, 90, true)).toBe(3);
  expect(campaignStars(60, 90, true)).toBe(3);
});
describe('inspections', () => {
  const load = { x: 8, y: .5, z: 4 };
  it('requires the cargo at each stop in order and a continuous safe hold', () => {
    const scan = new InspectionSystem([[8, 4], [-8, 8]]);
    scan.update(3, { ...load, x: -8, z: 8 }, 0, 1, true);
    expect(scan.current).toBe(0);
    scan.update(1, load, 0, 1, true);
    scan.update(.1, load, 2, 1, true);
    expect(scan.hold).toBe(0);
    scan.update(1.9, load, 0, 1, true);
    expect(scan.complete).toBe(false);
    scan.update(.2, load, 0, 1, true);
    expect(scan.current).toBe(1);
    scan.update(3, { ...load, x: -8, z: 8 }, 0, 1, true);
    expect(scan.complete).toBe(true);
  });
  it('rejects empty forks, grounded loads, high loads, tipping and negative speed', () => {
    for (const [p, speed, upright, carried] of [[load, 0, 1, false], [{ ...load, y: 0 }, 0, 1, true], [{ ...load, y: 2 }, 0, 1, true], [load, 0, .6, true], [load, -3, 1, true]] as const) {
      const scan = new InspectionSystem([[8, 4]]);
      scan.update(3, p, speed, upright, carried);
      expect(scan.current).toBe(0);
    }
  });
});
it('provides fourteen named, linked, localized missions with room to unload', () => {
  expect(levels).toHaveLength(14);
  expect(new Set(levels.map(l => l.id)).size).toBe(14);
  expect(new Set(levels.map(l => l.name)).size).toBe(14);
  expect(Object.keys(en).sort()).toEqual(Object.keys(sk).sort());
  for (const l of levels) { expect(l.target.width).toBeGreaterThan(3.3); expect(l.target.depth).toBeGreaterThan(3.3); }
  expect(levels[9].inspections).toHaveLength(3);
});
describe('campaign records', () => {
  it('isolates levels, saves fastest time and highest stars independently', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
    const p = new CampaignProgress('forklift', storage);
    p.complete('one', 80, 2); p.complete('one', 100, 3); p.complete('one', 110, 1);
    expect(new CampaignProgress('forklift', storage).get('one')).toEqual({ bestSeconds: 80, stars: 3 });
    expect(p.get('two')).toBeUndefined();
    expect(new CampaignProgress('office', storage).get('one')).toBeUndefined();
    p.complete('one', 0, 3); p.complete('two', 10, 4);
    expect(p.get('one')?.bestSeconds).toBe(80); expect(p.get('two')).toBeUndefined();
  });
  it('survives corrupt data and blocked writes with session progress', () => {
    const p = new CampaignProgress('test', { getItem: () => '{', setItem: () => { throw Error(); } });
    expect(p.get('one')).toBeUndefined(); p.complete('one', 10, 2);
    expect(p.get('one')?.stars).toBe(2);
  });
});
