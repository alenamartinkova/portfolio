import { BufferGeometry, Float32BufferAttribute } from 'three';

/** Four shoulder rings form a painted cardboard chamfer, with a flat inset top. */
export function beveledPrism(
  radius: number,
  height: number,
  sides = 6,
  chamfer = 0.025,
): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  const rings = [
    { r: radius - chamfer, y: 0 },
    { r: radius, y: chamfer },
    { r: radius, y: height - chamfer },
    { r: radius - chamfer, y: height },
  ];
  function vertex(x: number, y: number, z: number): number {
    const index = positions.length / 3;
    positions.push(x, y, z);
    uv.push(0.5 + x / (radius * 2), 0.5 + z / (radius * 2));
    return index;
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    const lower = rings[ring];
    const upper = rings[ring + 1];
    if (!lower || !upper) continue;
    for (let side = 0; side < sides; side++) {
      const a = (side * Math.PI * 2) / sides,
        b = ((side + 1) * Math.PI * 2) / sides;
      const start = vertex(Math.sin(a) * lower.r, lower.y, Math.cos(a) * lower.r);
      vertex(Math.sin(b) * lower.r, lower.y, Math.cos(b) * lower.r);
      vertex(Math.sin(b) * upper.r, upper.y, Math.cos(b) * upper.r);
      vertex(Math.sin(a) * upper.r, upper.y, Math.cos(a) * upper.r);
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }
  const top = vertex(0, height, 0);
  for (let side = 0; side < sides; side++) {
    const a = (side * Math.PI * 2) / sides,
      b = ((side + 1) * Math.PI * 2) / sides;
    const first = vertex(
      Math.sin(a) * (radius - chamfer),
      height,
      Math.cos(a) * (radius - chamfer),
    );
    const second = vertex(
      Math.sin(b) * (radius - chamfer),
      height,
      Math.cos(b) * (radius - chamfer),
    );
    indices.push(top, first, second);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
