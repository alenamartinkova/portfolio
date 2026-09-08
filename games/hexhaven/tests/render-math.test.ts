import { describe, expect, it } from 'vitest';
import { createBoard } from '../src/core/board';
import { hexCorners } from '../src/core/coords';
import { beveledPrism } from '../src/render/geometry';
import { pieceGeometries } from '../src/render/pieceMesh';
import { createPositions, cubeToWorld } from '../src/render/positions';

describe('one canonical renderer projection', () => {
  const board = createBoard('beginner', 1);
  const positions = createPositions(board);
  it('places the center at the origin and adjacent centers one hex width apart', () => {
    expect(cubeToWorld({ q: 0, r: 0, s: 0 }).toArray()).toEqual([0, 0, 0]);
    expect(cubeToWorld({ q: 1, r: 0, s: -1 }).length()).toBeCloseTo(Math.sqrt(3));
  });
  it('derives every shared corner from three canonical grid cells at radius one', () => {
    for (const tile of board.tiles) {
      const center = positions.tiles.get(tile.id);
      if (!center) throw new Error('Missing tile position.');
      for (const id of hexCorners(tile.coord)) {
        const corner = positions.vertices.get(id);
        if (!corner) throw new Error('Missing corner.');
        expect(corner.distanceTo(center)).toBeCloseTo(1, 12);
      }
    }
    expect(positions.vertices.size).toBe(54);
  });
  it('places all 72 edges exactly halfway between endpoints one unit apart', () => {
    for (const edge of board.edges) {
      const a = positions.vertices.get(edge.vertices[0]);
      const b = positions.vertices.get(edge.vertices[1]);
      const middle = positions.edges.get(edge.id);
      if (!a || !b || !middle) throw new Error('Missing edge position.');
      expect(a.distanceTo(b)).toBeCloseTo(1, 12);
      expect(a.distanceTo(middle)).toBeCloseTo(0.5, 12);
      expect(b.distanceTo(middle)).toBeCloseTo(0.5, 12);
    }
  });
});

describe('procedural low-poly geometry', () => {
  it('builds a flat upward-facing inset top and three chamfer wall rings', () => {
    const geometry = beveledPrism(0.975, 0.18);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const top = Array.from({ length: position.count }, (_, i) => i).filter(
      (i) => Math.abs(position.getY(i) - 0.18) < 1e-6 && normal.getY(i) > 0.999,
    );
    expect(top.length).toBeGreaterThanOrEqual(13);
    expect(geometry.index?.count).toBe(126);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.min.y).toBe(0);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(0.18);
    geometry.dispose();
  });
  it('creates complete road, village, town and hood-pawn geometry without incompatible buffer formats', () => {
    const geometries = pieceGeometries();
    for (const [kind, geometry] of Object.entries(geometries)) {
      geometry.computeBoundingBox();
      const triangles = (geometry.index?.count ?? geometry.getAttribute('position').count) / 3;
      expect(triangles, kind).toBeGreaterThan(20);
      expect(triangles, kind).toBeLessThan(1500);
      expect(geometry.boundingBox?.min.y, kind).toBeGreaterThan(0.15);
      expect(geometry.boundingBox?.max.y, kind).toBeLessThan(1);
      geometry.dispose();
    }
  });
});
