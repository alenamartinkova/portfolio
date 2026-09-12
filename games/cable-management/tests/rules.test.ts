import { describe, expect, it } from 'vitest';
import {
  crossings,
  generateCables,
  intersects,
  stepCables,
  straighten,
} from '../src/core/cables';
import {
  assist,
  drawerComplete,
  fits,
  generateDrawer,
  occupied,
  place,
  transform,
  type Cell,
} from '../src/core/drawer';
import { dateKey, levelSpec } from '../src/core/random';
import { DeskProgress } from '../src/progress';

describe('solvable drawer generation', () => {
  it('packs every object without overlaps or overflow for 300 seeds and all campaign sizes', () => {
    for (const [width, depth] of [
      [6, 4],
      [8, 4],
      [8, 5],
    ])
      for (let seed = 0; seed < 100; seed++) {
        const drawer = generateDrawer(seed, width, depth);
        expect(drawer.pieces.every((p) => p.position === null)).toBe(true);
        const count = drawer.pieces.reduce((n, p) => n + p.cells.length, 0);
        expect(count / (width * depth)).toBeGreaterThanOrEqual(0.85);
        expect(count).toBeLessThanOrEqual(width * depth);
        for (const piece of drawer.pieces) {
          // Every scrambled orientation has an inverse in the eight symmetries.
          const canonical = (cells: Cell[]) =>
            cells
              .map((c) => c.join(','))
              .sort()
              .join(';');
          const candidates: string[] = [];
          let cells = piece.cells;
          for (let i = 0; i < 4; i++) {
            candidates.push(
              canonical(cells),
              canonical(transform(cells, true)),
            );
            cells = transform(cells);
          }
          expect(candidates).toContain(canonical(piece.solution.cells));
          piece.cells = piece.solution.cells;
          expect(place(drawer, piece, piece.solution.origin)).toBe(true);
        }
        expect(drawerComplete(drawer)).toBe(true);
      }
  });
  it('rejects occupied cells, height overflow, negative, fractional and out-of-bounds placement', () => {
    const d = generateDrawer(42, 6, 4),
      a = d.pieces[0],
      b = d.pieces[1];
    a.cells = [[0, 0, 0]];
    b.cells = [[0, 0, 0]];
    expect(place(d, a, [0, 0, 0])).toBe(true);
    for (const origin of [
      [0, 0, 0],
      [-1, 0, 0],
      [6, 0, 0],
      [0, 4, 0],
      [0, 0, 1],
      [0.5, 0, 0],
    ] as Cell[])
      expect(place(d, b, origin)).toBe(false);
    expect(b.position).toBeNull();
    expect(fits(d, a, [0, 0, 0])).toBe(true);
    expect(drawerComplete(d)).toBe(false);
  });
  it('preserves occupied cells under four turns or two flips', () => {
    const shape: Cell[] = [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ];
    let cells = shape;
    for (let n = 0; n < 4; n++) cells = transform(cells);
    expect(cells).toEqual(shape);
    expect(transform(transform(shape, true), true)).toEqual(shape);
    expect(occupied(shape, [2, 3, 0])[3]).toEqual([3, 4, 1]);
  });
  it('assist clears conflicts without losing objects and eventually completes any seed', () => {
    for (let seed = 0; seed < 30; seed++) {
      const d = generateDrawer(seed, 8, 5),
        count = d.pieces.length;
      for (const p of d.pieces) assist(d, p);
      expect(drawerComplete(d)).toBe(true);
      expect(d.pieces).toHaveLength(count);
    }
  });
  it('is reproducible and varies with the seed', () => {
    expect(generateDrawer(9, 8, 5)).toEqual(generateDrawer(9, 8, 5));
    expect(generateDrawer(9, 8, 5)).not.toEqual(generateDrawer(10, 8, 5));
  });
});

describe('relaxed cable simulation', () => {
  const p = (x: number, y: number) => ({ x, y });
  it('recognizes crossings, exact contact and collinear overlap', () => {
    expect(intersects(p(0, 0), p(2, 2), p(0, 2), p(2, 0))).toBe(true);
    expect(intersects(p(0, 0), p(1, 0), p(1, 0), p(1, 1))).toBe(true);
    expect(intersects(p(0, 0), p(3, 0), p(1, 0), p(4, 0))).toBe(true);
    expect(intersects(p(0, 0), p(1, 0), p(2, 0), p(3, 0))).toBe(false);
    expect(intersects(p(0, 0), p(2, 0), p(0, 1), p(2, 1))).toBe(false);
  });
  it('starts tangled, stays tangled without input and has an untangled solution', () => {
    for (let seed = 0; seed < 12; seed++) {
      const cables = generateCables(seed, 4 + (seed % 3) * 2);
      expect(crossings(cables.map((c) => c.nodes)).length).toBeGreaterThan(0);
      for (let i = 0; i < 120; i++) stepCables(cables, null);
      expect(crossings(cables.map((c) => c.nodes)).length).toBeGreaterThan(0);
      cables.forEach(straighten);
      for (let i = 0; i < 120; i++) stepCables(cables, null);
      expect(crossings(cables.map((c) => c.nodes))).toEqual([]);
    }
  });
  it('moves a grabbed interior node, fixes endpoints and settles after release', () => {
    const cables = generateCables(17, 4);
    cables.forEach(straighten);
    const target = { x: -4.3, y: 0.8 };
    for (let i = 0; i < 40; i++)
      stepCables(cables, { cable: 0, node: 11, target });
    expect(cables[0].nodes[11].x).toBeCloseTo(target.x, 2);
    expect(cables[0].nodes[0].x).toBe(cables[0].start.x);
    expect(cables[0].nodes[22].y).toBe(cables[0].end.y);
    let motion = 1;
    for (let i = 0; i < 300; i++) motion = stepCables(cables, null);
    expect(motion).toBeLessThan(0.001);
    expect(
      cables
        .flatMap((c) => c.nodes)
        .every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
    ).toBe(true);
  });
});

describe('evenings and local daily progression', () => {
  it('provides two of each mode per evening and stable date seeds', () => {
    for (let evening = 0; evening < 3; evening++)
      expect([0, 1, 2, 3].map((i) => levelSpec(evening * 4 + i).mode)).toEqual([
        'untangle',
        'untangle',
        'drawer',
        'drawer',
      ]);
    expect(dateKey(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
    expect(levelSpec(0, '2026-01-02')).toEqual(levelSpec(11, '2026-01-02'));
    expect(levelSpec(0, '2026-01-02').seed).not.toBe(
      levelSpec(0, '2026-01-03').seed,
    );
  });
  it('restores only valid completion records and preserves session progress on storage errors', () => {
    let saved = '{"completed":[0,0,1,-1,12,"2"],"daily":["bad","2026-01-02"]}';
    const storage = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    const progress = new DeskProgress(storage);
    expect(progress.completed).toEqual([0, 1]);
    expect(progress.next).toBe(2);
    for (let n = 2; n < 12; n++) progress.complete(n);
    expect(progress.evenings).toBe(3);
    expect(new DeskProgress(storage).completed).toHaveLength(12);
    const blocked = new DeskProgress({
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    });
    blocked.complete(0);
    expect(blocked.completed).toEqual([0]);
    expect(blocked.persistent).toBe(false);
    expect(new DeskProgress().persistent).toBe(false);
  });
});
