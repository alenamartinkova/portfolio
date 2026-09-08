import { describe, expect, it } from 'vitest';
import {
  createTopology,
  cubeFromKey,
  cubeKey,
  edgeVertices,
  hexCorners,
  hexDisk,
  hexEdges,
  hexNeighbors,
  LAND_HEX_COORDS,
  vertexEdges,
  vertexHexes,
  vertexNeighbors,
} from '../src/core/coords';

const topology = createTopology();

describe('cube coordinates and canonical topology', () => {
  it('contains 19 tiles, 54 land vertices, and 72 land edges', () => {
    expect(LAND_HEX_COORDS).toHaveLength(19);
    expect(topology.vertices).toHaveLength(54);
    expect(topology.edges).toHaveLength(72);
    expect(new Set(topology.vertices.map((vertex) => vertex.id)).size).toBe(54);
    expect(new Set(topology.edges.map((edge) => edge.id)).size).toBe(72);
  });

  it.each([0, 1, 2, 3])('constructs a radius %i disk with valid cube coordinates', (radius) => {
    const disk = hexDisk(radius);
    expect(disk).toHaveLength(1 + 3 * radius * (radius + 1));
    for (const cube of disk) {
      expect(cube.q + cube.r + cube.s).toBe(0);
      expect(Math.max(Math.abs(cube.q), Math.abs(cube.r), Math.abs(cube.s))).toBeLessThanOrEqual(
        radius,
      );
      expect(cubeFromKey(cubeKey(cube))).toEqual(cube);
    }
  });

  it('provides six distinct neighbors, corners, and edges for every tile', () => {
    const vertexIds = new Set(topology.vertices.map((vertex) => vertex.id));
    const edgeIds = new Set(topology.edges.map((edge) => edge.id));
    for (const cube of LAND_HEX_COORDS) {
      expect(new Set(hexNeighbors(cube).map(cubeKey)).size).toBe(6);
      expect(new Set(hexCorners(cube)).size).toBe(6);
      expect(new Set(hexEdges(cube)).size).toBe(6);
      for (const vertex of hexCorners(cube)) expect(vertexIds.has(vertex)).toBe(true);
      for (const edge of hexEdges(cube)) expect(edgeIds.has(edge)).toBe(true);
    }
  });

  it('collapses shared corners by identity including virtual sea tiles', () => {
    for (const cube of LAND_HEX_COORDS) {
      for (const neighbor of hexNeighbors(cube)) {
        const shared = hexCorners(cube).filter((corner) => hexCorners(neighbor).includes(corner));
        expect(shared).toHaveLength(2);
      }
    }
    for (const vertex of topology.vertices) {
      const canonicalHexes = vertex.id.split('|');
      expect(canonicalHexes).toHaveLength(3);
      expect(canonicalHexes).toEqual([...canonicalHexes].sort());
      for (const id of canonicalHexes) expect(hexCorners(cubeFromKey(id))).toContain(vertex.id);
    }
  });

  it('distinguishes actual land adjacency from the three canonical identity hexes', () => {
    const counts = [1, 2, 3].map(
      (count) =>
        topology.vertices.filter((vertex) => vertexHexes(topology, vertex.id).length === count)
          .length,
    );
    expect(counts).toEqual([18, 12, 24]);
    expect(topology.vertices.reduce((sum, vertex) => sum + vertex.hexes.length, 0)).toBe(19 * 6);
    for (const vertex of topology.vertices) {
      for (const id of vertexHexes(topology, vertex.id)) {
        expect(LAND_HEX_COORDS.map(cubeKey)).toContain(id);
        expect(hexCorners(cubeFromKey(id))).toContain(vertex.id);
      }
    }
  });

  it('provides reciprocal vertex neighbors and incident edges', () => {
    for (const vertex of topology.vertices) {
      const neighbors = vertexNeighbors(topology, vertex.id);
      const edges = vertexEdges(topology, vertex.id);
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
      expect(neighbors.length).toBeLessThanOrEqual(3);
      expect(edges).toHaveLength(neighbors.length);
      for (const neighbor of neighbors)
        expect(vertexNeighbors(topology, neighbor)).toContain(vertex.id);
      for (const edge of edges) {
        expect(edgeVertices(topology, edge)).toContain(vertex.id);
        expect(edgeVertices(topology, edge).some((id) => neighbors.includes(id))).toBe(true);
      }
    }
  });

  it('provides two distinct, reciprocal endpoints per edge', () => {
    for (const edge of topology.edges) {
      const endpoints = edgeVertices(topology, edge.id);
      expect(endpoints).toHaveLength(2);
      expect(endpoints[0]).not.toBe(endpoints[1]);
      expect(edge.id).toBe([...endpoints].sort().join('~'));
      for (const vertex of endpoints) expect(vertexEdges(topology, vertex)).toContain(edge.id);
    }
  });

  it('rejects malformed coordinates and unknown topology ids', () => {
    expect(() => cubeKey({ q: 1, r: 1, s: 1 })).toThrow(RangeError);
    expect(() => cubeKey({ q: 0.5, r: 0, s: -0.5 })).toThrow(RangeError);
    expect(() => cubeFromKey('0,0')).toThrow(RangeError);
    expect(() => cubeFromKey(',0,0')).toThrow(RangeError);
    expect(() => cubeFromKey('1,1,1')).toThrow(RangeError);
    expect(() => hexDisk(-1)).toThrow(RangeError);
    expect(() => vertexNeighbors(topology, 'missing')).toThrow(RangeError);
    expect(() => vertexEdges(topology, 'missing')).toThrow(RangeError);
    expect(() => vertexHexes(topology, 'missing')).toThrow(RangeError);
    expect(() => edgeVertices(topology, 'missing')).toThrow(RangeError);
  });
});
