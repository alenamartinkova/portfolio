import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Board } from '../core/board';
import type { GameState } from '../core/state';
import { localize } from '../i18n';
import {
  ACCESSIBLE_COLORS,
  PLAYER_COLORS,
  glyphTexture,
  matte,
  paintTexture,
  solid,
} from './materials';
import type { BoardPositions } from './positions';

export type PieceKind = 'village' | 'town' | 'road' | 'bandit';
function merged(parts: BufferGeometry[]): BufferGeometry {
  const normalized = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const result = mergeGeometries(normalized, false);
  if (!result)
    throw new Error(
      localize('Unable to combine building geometry.', 'Nepodarilo sa vytvoriť modely stavieb.'),
    );
  for (const part of parts) part.dispose();
  for (const part of normalized) part.dispose();
  return result;
}
function roof(width: number, height: number, depth: number): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 }).translate(
    0,
    0,
    -depth / 2,
  );
}
export function pieceGeometries(): Readonly<Record<PieceKind, BufferGeometry>> {
  const village = merged([
    new BoxGeometry(0.32, 0.25, 0.29).translate(0, 0.305, 0),
    roof(0.39, 0.18, 0.36).translate(0, 0.43, 0),
    new BoxGeometry(0.055, 0.12, 0.055).translate(-0.09, 0.51, -0.075),
  ]);
  const banner = new Shape();
  banner.moveTo(0, 0);
  banner.lineTo(0.17, 0);
  banner.lineTo(0.125, -0.045);
  banner.lineTo(0.17, -0.09);
  banner.lineTo(0, -0.09);
  banner.closePath();
  const town = merged([
    new BoxGeometry(0.42, 0.29, 0.35).translate(-0.04, 0.335, 0.035),
    roof(0.49, 0.15, 0.41).translate(-0.04, 0.48, 0.035),
    new BoxGeometry(0.15, 0.48, 0.15).translate(0.14, 0.42, -0.1),
    roof(0.19, 0.13, 0.19).translate(0.14, 0.66, -0.1),
    new CylinderGeometry(0.009, 0.009, 0.23, 5).translate(0.14, 0.8, -0.1),
    new ExtrudeGeometry(banner, { depth: 0.014, bevelEnabled: false }).translate(0.15, 0.91, -0.1),
  ]);
  const roadShape = new Shape();
  roadShape.moveTo(-0.065, -0.42);
  roadShape.lineTo(0.065, -0.42);
  roadShape.lineTo(0.091, -0.31);
  roadShape.lineTo(0.091, 0.31);
  roadShape.lineTo(0.065, 0.42);
  roadShape.lineTo(-0.065, 0.42);
  roadShape.lineTo(-0.091, 0.31);
  roadShape.lineTo(-0.091, -0.31);
  roadShape.closePath();
  const road = new ExtrudeGeometry(roadShape, {
    depth: 0.087,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.011,
    bevelThickness: 0.01,
  })
    .rotateX(-Math.PI / 2)
    .translate(0, 0.202, 0);
  const bandit = merged([
    new CylinderGeometry(0.16, 0.21, 0.07, 12).translate(0, 0.225, 0),
    new ConeGeometry(0.155, 0.48, 12).translate(0, 0.5, 0),
    new SphereGeometry(0.116, 12, 8).scale(1, 1.18, 1).translate(0, 0.73, 0),
    new ConeGeometry(0.112, 0.13, 10).translate(0, 0.85, 0),
  ]);
  return { village, town, road, bandit };
}
export interface PieceMeshes {
  readonly group: Group;
  readonly geometries: Readonly<Record<PieceKind, BufferGeometry>>;
  update(state: GameState): void;
  setColorBlind(value: boolean): void;
}
export function createPieceMeshes(board: Board, positions: BoardPositions): PieceMeshes {
  const group = new Group(),
    geometries = pieceGeometries(),
    dummy = new Object3D();
  const players: {
    village: InstancedMesh;
    town: InstancedMesh;
    road: InstancedMesh;
    glyph: InstancedMesh;
    material: MeshStandardMaterial;
  }[] = [];
  for (let player = 0; player < 4; player++) {
    const material = matte(PLAYER_COLORS[player] ?? PLAYER_COLORS[0]);
    const village = new InstancedMesh(geometries.village, material, 5),
      town = new InstancedMesh(geometries.town, material, 4),
      road = new InstancedMesh(geometries.road, material, 15);
    const glyphMaterial = new MeshBasicMaterial({
      map: glyphTexture(player),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const glyph = new InstancedMesh(
      new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      glyphMaterial,
      24,
    );
    for (const mesh of [village, town, road]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      group.add(mesh);
    }
    glyph.count = 0;
    glyph.frustumCulled = false;
    group.add(glyph);
    players.push({ village, town, road, glyph, material });
  }
  const bandit = new Mesh(geometries.bandit, matte('#302c36'));
  bandit.castShadow = true;
  bandit.receiveShadow = true;
  group.add(bandit);
  const banditFace = new Mesh(new SphereGeometry(0.057, 10, 8).scale(1, 1, 0.28), solid('#100f13'));
  banditFace.position.set(0, 0.736, 0.101);
  bandit.add(banditFace);
  let lastState: GameState | null = null;
  function update(state: GameState): void {
    if (state === lastState) return;
    lastState = state;
    for (let player = 0; player < 4; player++) {
      const meshes = players[player];
      if (!meshes) continue;
      let villages = 0,
        towns = 0,
        roads = 0,
        glyphs = 0;
      for (const [id, building] of Object.entries(state.buildings)) {
        if (building.owner !== player) continue;
        const p = positions.vertices.get(id);
        if (!p) continue;
        const kind = building.kind;
        dummy.position.copy(p);
        dummy.rotation.set(0, 0.16 + player * 0.19, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        meshes[kind].setMatrixAt(kind === 'village' ? villages++ : towns++, dummy.matrix);
        dummy.position.y = kind === 'village' ? 0.616 : 0.64;
        dummy.scale.set(0.2, 1, 0.2);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        meshes.glyph.setMatrixAt(glyphs++, dummy.matrix);
      }
      for (const edge of board.edges) {
        if (state.roads[edge.id] !== player) continue;
        const a = positions.vertices.get(edge.vertices[0]),
          b = positions.vertices.get(edge.vertices[1]),
          center = positions.edges.get(edge.id);
        if (!a || !b || !center) continue;
        const angle = Math.atan2(b.x - a.x, b.z - a.z);
        dummy.position.copy(center);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        meshes.road.setMatrixAt(roads++, dummy.matrix);
        dummy.position.y = 0.305;
        dummy.scale.set(0.165, 1, 0.165);
        dummy.updateMatrix();
        meshes.glyph.setMatrixAt(glyphs++, dummy.matrix);
      }
      meshes.village.count = villages;
      meshes.town.count = towns;
      meshes.road.count = roads;
      meshes.glyph.count = glyphs;
      meshes.village.instanceMatrix.needsUpdate = true;
      meshes.town.instanceMatrix.needsUpdate = true;
      meshes.road.instanceMatrix.needsUpdate = true;
      meshes.glyph.instanceMatrix.needsUpdate = true;
    }
    const p = positions.tiles.get(state.bandit);
    if (p) bandit.position.set(p.x + 0.37, 0, p.z + 0.16);
  }
  function setColorBlind(value: boolean): void {
    for (let index = 0; index < players.length; index++) {
      const materials = players[index];
      if (!materials) continue;
      materials.material.map = paintTexture(
        (value ? ACCESSIBLE_COLORS : PLAYER_COLORS)[index] ?? PLAYER_COLORS[0],
      );
      materials.material.color.set('#ffffff');
      materials.material.needsUpdate = true;
    }
  }
  return { group, geometries, update, setColorBlind };
}
