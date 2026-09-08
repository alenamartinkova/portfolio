import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Board, Terrain } from '../core/board';
import { getLocale, localize, resourceName } from '../i18n';
import {
  PALETTE,
  RESOURCE_GLYPHS,
  canvasTexture,
  createCanvasTextureCache,
  gridTexture,
  matte,
  solid,
} from './materials';
import type { CanvasTextureCache } from './materials';
import { DEFAULT_APPEARANCE } from './appearance';
import type { BoardAppearance } from './appearance';
import { beveledPrism } from './geometry';
import type { BoardPositions } from './positions';

export interface BoardMeshes {
  readonly group: Group;
  readonly seaTime: { value: number };
  readonly tokenFaces: Mesh;
  setAppearance(appearance: BoardAppearance): void;
  refreshLocale(): void;
  dispose(): void;
}
function merged(parts: BufferGeometry[]): BufferGeometry {
  const result = mergeGeometries(parts, false);
  if (!result)
    throw new Error(
      localize('Unable to combine miniature geometry.', 'Nepodarilo sa vytvoriť modely krajiny.'),
    );
  for (const part of parts) part.dispose();
  return result;
}
function atlasGeometry(
  face: BufferGeometry,
  index: number,
  columns: number,
  rows: number,
): BufferGeometry {
  const uv = face.getAttribute('uv');
  for (let i = 0; i < uv.count; i++)
    uv.setXY(
      i,
      ((index % columns) + uv.getX(i)) / columns,
      (rows - 1 - Math.floor(index / columns) + uv.getY(i)) / rows,
    );
  return face;
}
function miniatures(board: Board, positions: BoardPositions, group: Group): void {
  const trunk = new CylinderGeometry(0.035, 0.048, 0.22, 5).translate(0, 0.3, 0);
  const foliage = merged([
    new ConeGeometry(0.18, 0.34, 7).translate(0, 0.45, 0),
    new ConeGeometry(0.135, 0.3, 7).translate(0, 0.6, 0),
  ]);
  const wheatParts: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.07;
    wheatParts.push(new BoxGeometry(0.018, 0.24, 0.018).translate(x, 0.31, 0));
    wheatParts.push(new SphereGeometry(0.033, 4, 3).scale(1, 2.6, 1).translate(x, 0.47, 0));
  }
  const wheat = merged(wheatParts);
  const sheep = merged([
    new SphereGeometry(0.1, 8, 6).scale(1.35, 0.8, 0.82).translate(0, 0.32, 0),
    ...[-1, 1].flatMap((x) =>
      [-1, 1].map((z) =>
        new BoxGeometry(0.023, 0.09, 0.025).translate(x * 0.065, 0.225, z * 0.045),
      ),
    ),
  ]);
  const head = new SphereGeometry(0.048, 6, 4).scale(0.8, 1, 1.2).translate(0.13, 0.33, 0);
  const rock = new ConeGeometry(0.24, 0.34, 5)
    .rotateY(0.4)
    .scale(1.1, 1, 0.75)
    .translate(0, 0.36, 0);
  const mountain = new ConeGeometry(0.3, 0.64, 5).translate(0, 0.5, 0);
  const snow = new ConeGeometry(0.107, 0.215, 5).translate(0, 0.72, 0);
  const dune = new SphereGeometry(0.3, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2)
    .scale(1, 0.27, 0.5)
    .translate(0, 0.195, 0);
  const configurations: {
    terrain: Terrain;
    geometry: BufferGeometry;
    material: MeshStandardMaterial;
    count: number;
  }[] = [
    { terrain: 'forest', geometry: trunk, material: solid('#62432d'), count: 4 },
    { terrain: 'forest', geometry: foliage, material: matte('#1e5439'), count: 4 },
    { terrain: 'fields', geometry: wheat, material: solid('#f4d47a'), count: 3 },
    {
      terrain: 'fields',
      geometry: new BoxGeometry(0.4, 0.014, 0.04).translate(0, 0.197, 0.055),
      material: solid('#b28137'),
      count: 3,
    },
    { terrain: 'pasture', geometry: sheep, material: solid('#e9e3c8'), count: 3 },
    { terrain: 'pasture', geometry: head, material: solid('#514a3e'), count: 3 },
    { terrain: 'hills', geometry: rock, material: matte('#913f27'), count: 3 },
    { terrain: 'mountains', geometry: mountain, material: matte('#555e68'), count: 3 },
    { terrain: 'mountains', geometry: snow, material: solid('#dedfdb'), count: 3 },
    { terrain: 'desert', geometry: dune, material: matte('#cdb984'), count: 4 },
  ];
  const dummy = new Object3D();
  for (const config of configurations) {
    const tiles = board.tiles.filter((t) => t.terrain === config.terrain);
    const mesh = new InstancedMesh(config.geometry, config.material, tiles.length * config.count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    let index = 0;
    for (const tile of tiles) {
      const center = positions.tiles.get(tile.id);
      if (!center) continue;
      for (let item = 0; item < config.count; item++) {
        const angle = (item / config.count) * Math.PI * 2 + 0.5 + board.tiles.indexOf(tile) * 0.21;
        const radius = config.terrain === 'mountains' ? 0.51 : 0.52;
        let offsetX = Math.sin(angle) * radius;
        const offsetZ = Math.cos(angle) * radius;
        // Preserve the default camera's view of each number token.
        if (
          (config.terrain === 'forest' || config.terrain === 'mountains') &&
          offsetZ > 0.1 &&
          Math.abs(offsetX) < 0.31
        )
          offsetX = offsetX < 0 ? -0.48 : 0.48;
        dummy.position.set(center.x + offsetX, 0, center.z + offsetZ);
        dummy.rotation.set(0, angle + 0.35, 0);
        dummy.scale.setScalar(0.9 + (item % 2) * 0.13);
        dummy.updateMatrix();
        mesh.setMatrixAt(index++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
}
function harbours(
  board: Board,
  positions: BoardPositions,
  group: Group,
  localizedTextures: CanvasTextureCache,
): { setAppearance(appearance: BoardAppearance): void } {
  const dummy = new Object3D();
  const planks = new InstancedMesh(
    new BoxGeometry(0.43, 0.045, 0.073),
    matte('#646675'),
    board.harbours.length * 7,
  );
  const piles = new InstancedMesh(
    new CylinderGeometry(0.037, 0.045, 0.3, 6),
    solid('#3f414e'),
    board.harbours.length * 4,
  );
  const labels: BufferGeometry[] = [];
  const atlas = (appearance: BoardAppearance) =>
    localizedTextures.texture(
      `harbour-labels-${getLocale()}-${appearance.surface}-${appearance.text}-${appearance.accent}`,
      512,
      512,
      (context) => {
        for (let index = 0; index < board.harbours.length; index++) {
          const harbour = board.harbours[index];
          if (!harbour) continue;
          const x = (index % 3) * 170,
            y = Math.floor(index / 3) * 170;
          context.fillStyle = appearance.surface;
          context.beginPath();
          context.roundRect(x + 3, y + 28, 164, 112, 5);
          context.fill();
          context.strokeStyle = appearance.accent;
          context.lineWidth = 2;
          context.stroke();
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = appearance.text;
          context.font = '600 48px "Space Grotesk", sans-serif';
          context.fillText(harbour.resource ? '2 : 1' : '3 : 1', x + 85, y + 69);
          context.font = '500 21px "JetBrains Mono", monospace';
          context.fillText(
            harbour.resource
              ? `${RESOURCE_GLYPHS[harbour.resource] ?? ''} ${resourceName(harbour.resource)}`
              : localize('Any resource', 'Ľubovoľná'),
            x + 85,
            y + 112,
            152,
          );
        }
      },
    );
  for (let index = 0; index < board.harbours.length; index++) {
    const harbour = board.harbours[index];
    if (!harbour) continue;
    const a = positions.vertices.get(harbour.vertices[0]),
      b = positions.vertices.get(harbour.vertices[1]);
    if (!a || !b) continue;
    const x = (a.x + b.x) / 2,
      z = (a.z + b.z) / 2;
    const length = Math.hypot(x, z),
      dx = x / length,
      dz = z / length;
    const angle = Math.atan2(dx, dz);
    for (let plank = 0; plank < 7; plank++) {
      dummy.position.set(x + dx * (0.08 + plank * 0.083), -0.015, z + dz * (0.08 + plank * 0.083));
      dummy.rotation.set(0, angle, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      planks.setMatrixAt(index * 7 + plank, dummy.matrix);
    }
    for (let pile = 0; pile < 4; pile++) {
      const side = pile % 2 === 0 ? -1 : 1;
      const distance = pile < 2 ? 0.05 : 0.62;
      dummy.position.set(
        x + dx * distance + dz * 0.2 * side,
        -0.07,
        z + dz * distance - dx * 0.2 * side,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      piles.setMatrixAt(index * 4 + pile, dummy.matrix);
    }
    const label = atlasGeometry(new PlaneGeometry(0.91, 0.91), index, 3, 3);
    label.rotateX(-Math.PI / 2);
    label.translate(x + dx * 0.99, 0.008, z + dz * 0.99);
    labels.push(label);
  }
  planks.castShadow = true;
  piles.castShadow = true;
  planks.receiveShadow = true;
  group.add(planks, piles);
  const labelMaterial = new MeshBasicMaterial({
    map: atlas(DEFAULT_APPEARANCE),
    fog: false,
    toneMapped: false,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  group.add(new Mesh(merged(labels), labelMaterial));
  return {
    setAppearance: (appearance) => {
      labelMaterial.map = atlas(appearance);
      labelMaterial.needsUpdate = true;
    },
  };
}
export function createBoardMeshes(board: Board, positions: BoardPositions): BoardMeshes {
  const group = new Group();
  const localizedTextures = createCanvasTextureCache();
  const dummy = new Object3D();
  const tableMaterial = new MeshStandardMaterial({
    map: gridTexture(DEFAULT_APPEARANCE),
    roughness: 1,
    metalness: 0,
  });
  const table = new Mesh(new BoxGeometry(40, 0.5, 36), tableMaterial);
  table.position.y = -0.57;
  table.receiveShadow = true;
  group.add(table);
  const seaTime = { value: 0 };
  const seaMaterial = matte('#1F5A66');
  seaMaterial.roughness = 0.83;
  seaMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.seaTime = seaTime;
    shader.vertexShader = `uniform float seaTime;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.y += sin(position.x * 2.2 + seaTime * .6) * cos(position.z * 1.6 + seaTime * .35) * .012;',
    );
  };
  const seaGeometry = new CircleGeometry(5.8, 96);
  seaGeometry.rotateX(-Math.PI / 2);
  const sea = new Mesh(seaGeometry, seaMaterial);
  sea.position.y = -0.15;
  sea.receiveShadow = true;
  group.add(sea);
  const frameMaterial = new MeshStandardMaterial({
    color: '#30303d',
    roughness: 0.72,
    metalness: 0.22,
  });
  const frame = new Mesh(new TorusGeometry(5.85, 0.19, 8, 96), frameMaterial);
  frame.rotation.x = Math.PI / 2;
  frame.position.y = -0.1;
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);
  const accentInset = new Mesh(
    new RingGeometry(5.805, 5.827, 96),
    new MeshBasicMaterial({ color: DEFAULT_APPEARANCE.accent, transparent: true, opacity: 0.62 }),
  );
  accentInset.rotation.x = -Math.PI / 2;
  accentInset.position.y = 0.081;
  group.add(accentInset);
  const shore = new Mesh(
    new RingGeometry(5.53, 5.57, 96),
    new MeshBasicMaterial({ color: '#67877b', transparent: true, opacity: 0.3 }),
  );
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = -0.115;
  group.add(shore);
  const hex = beveledPrism(0.975, 0.18, 6, 0.027);
  for (const terrain of Object.keys(PALETTE) as Terrain[]) {
    const tiles = board.tiles.filter((t) => t.terrain === terrain);
    const mesh = new InstancedMesh(hex, matte(PALETTE[terrain]), tiles.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tiles.forEach((tile, index) => {
      const position = positions.tiles.get(tile.id);
      if (position) {
        dummy.position.copy(position);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, new Color().setScalar(0.94 + (index % 3) * 0.035));
      }
    });
    group.add(mesh);
  }
  const numbered = board.tiles.filter((t) => t.number !== null);
  const tokenAtlas = canvasTexture('number-tokens', 768, 256, (context) => {
    for (let number = 2; number <= 12; number++) {
      if (number === 7) continue;
      const index = number - 2;
      const x = (index % 6) * 128,
        y = Math.floor(index / 6) * 128;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = number === 6 || number === 8 ? '#a03644' : '#252533';
      context.font = '650 70px "Space Grotesk", sans-serif';
      context.fillText(String(number), x + 64, y + 54);
      const pips = 6 - Math.abs(7 - number);
      for (let pip = 0; pip < pips; pip++) {
        context.beginPath();
        context.arc(x + 64 + (pip - (pips - 1) / 2) * 12, y + 102, 4.1, 0, Math.PI * 2);
        context.fill();
      }
    }
  });
  const tokens = new InstancedMesh(
    beveledPrism(0.235, 0.065, 32, 0.012),
    matte('#e3e5ee'),
    numbered.length,
  );
  tokens.castShadow = true;
  tokens.receiveShadow = true;
  const faces: BufferGeometry[] = [];
  numbered.forEach((tile, index) => {
    const p = positions.tiles.get(tile.id);
    if (!p) return;
    dummy.position.set(p.x, 0.188, p.z);
    dummy.updateMatrix();
    tokens.setMatrixAt(index, dummy.matrix);
    const face = atlasGeometry(new CircleGeometry(0.222, 32), (tile.number ?? 2) - 2, 6, 2);
    face.rotateX(-Math.PI / 2);
    face.translate(p.x, 0.255, p.z);
    faces.push(face);
  });
  group.add(tokens);
  const tokenFaces = new Mesh(
    merged(faces),
    new MeshBasicMaterial({ map: tokenAtlas, transparent: true, depthWrite: false }),
  );
  group.add(tokenFaces);
  miniatures(board, positions, group);
  const harbourMeshes = harbours(board, positions, group, localizedTextures);
  const compassTexture = () =>
    localizedTextures.texture(`compass-${getLocale()}`, 256, 256, (context) => {
      context.translate(128, 128);
      context.strokeStyle = '#ffffff';
      context.fillStyle = '#ffffff';
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(0, 0, 83, 0, Math.PI * 2);
      context.stroke();
      for (let i = 0; i < 8; i++) {
        context.save();
        context.rotate((i * Math.PI) / 4);
        context.beginPath();
        context.moveTo(0, -75);
        context.lineTo(11, 0);
        context.lineTo(0, 23);
        context.lineTo(-11, 0);
        context.closePath();
        if (i % 2 === 0) context.fill();
        else context.stroke();
        context.restore();
      }
      context.font = '500 24px "JetBrains Mono", monospace';
      context.textAlign = 'center';
      context.fillText(localize('N', 'S'), 0, -98);
    });
  const compass = new Mesh(
    new PlaneGeometry(0.74, 0.74),
    new MeshBasicMaterial({
      map: compassTexture(),
      color: DEFAULT_APPEARANCE.accent,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
  compass.rotation.x = -Math.PI / 2;
  compass.position.set(-4.55, -0.105, 2.9);
  group.add(compass);
  let currentAppearance = DEFAULT_APPEARANCE;
  function setAppearance(appearance: BoardAppearance): void {
    currentAppearance = appearance;
    tableMaterial.map = gridTexture(appearance);
    tableMaterial.needsUpdate = true;
    frameMaterial.color
      .set(appearance.surface)
      .lerp(new Color(appearance.text), appearance.theme === 'dark' ? 0.025 : 0.42);
    frameMaterial.color.lerp(new Color(appearance.accent), 0.035);
    accentInset.material.color.set(appearance.accent);
    compass.material.color.set(appearance.accent);
    harbourMeshes.setAppearance(appearance);
    seaMaterial.color.set(appearance.theme === 'dark' ? '#b8c2d0' : '#ffffff');
  }
  setAppearance(DEFAULT_APPEARANCE);
  return {
    group,
    seaTime,
    tokenFaces,
    setAppearance,
    refreshLocale: () => {
      harbourMeshes.setAppearance(currentAppearance);
      compass.material.map = compassTexture();
      compass.material.needsUpdate = true;
    },
    dispose: () => localizedTextures.dispose(),
  };
}
