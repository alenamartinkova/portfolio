import * as THREE from 'three';
import type { Cable, Point } from './core/cables';
import { fits, type Cell, type Drawer, type Piece } from './core/drawer';

export const colors = [
  '#e6a371',
  '#7fc4b4',
  '#b6a0d9',
  '#efcf7d',
  '#df929d',
  '#89b4d4',
  '#c0cd91',
  '#bca58c',
];
const ink = '#253639';
function disposeGroup(group: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry);
      (Array.isArray(object.material)
        ? object.material
        : [object.material]
      ).forEach((m) => materials.add(m));
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  group.clear();
}

export class DeskScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);
  readonly scene = new THREE.Scene();
  readonly puzzle = new THREE.Group();
  private decor = new THREE.Group();
  private items = new THREE.Group();
  private ghost = new THREE.Group();
  private desk = new THREE.Group();
  private cables: { sticks: THREE.Mesh[]; joints: THREE.Mesh[] }[] = [];
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.29);
  private observer: ResizeObserver;
  private radius = 0.075;
  private mode: 'untangle' | 'drawer' = 'untangle';
  private lamp: THREE.PointLight;
  private closure = 0;
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.camera.position.set(0, 19, 8);
    this.camera.lookAt(0, 0, -0.25);
    this.scene.add(new THREE.HemisphereLight('#e1e5dc', '#59514a', 2.1));
    const key = new THREE.DirectionalLight('#ffddad', 3.2);
    key.position.set(-3, 9, 5);
    key.castShadow = true;
    Object.assign(key.shadow.camera, {
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
    });
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.002;
    this.scene.add(key);
    this.lamp = new THREE.PointLight('#ffbd68', 24, 15, 2);
    this.lamp.position.set(4.6, 3, -3);
    this.scene.add(this.lamp);
    this.scene.add(this.desk, this.decor, this.puzzle);
    this.puzzle.add(this.items, this.ghost);
    this.makeDesk();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement!);
    this.resize();
  }
  private box(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  private cylinder(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: string,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  private makeDesk() {
    this.box(this.desk, 0, -0.35, 0, 12.8, 0.65, 9.1, '#9f7352');
    this.box(this.desk, 0, 0.002, 0, 12.6, 0.05, 8.95, '#bd9370');
    // A dark monitor back, its stand, a closed laptop and a small desk lamp.
    this.box(this.desk, -1.5, 0.25, -3.62, 2.5, 0.2, 0.9, ink);
    this.box(this.desk, -1.5, 0.75, -3.85, 0.22, 1.1, 0.25, ink);
    this.box(this.desk, -1.5, 1.3, -4.02, 4.3, 1.65, 0.22, '#35474b');
    for (let i = 0; i < 8; i++)
      this.box(
        this.desk,
        -2.25 + i * 0.22,
        1.18,
        -3.88,
        0.1,
        0.32,
        0.02,
        '#223134',
      );
    this.box(this.desk, -4.75, 0.17, -3.15, 1.85, 0.22, 1.4, '#849391');
    this.box(this.desk, -4.75, 0.29, -3.15, 0.3, 0.015, 0.3, '#b9c3b7');
    this.cylinder(this.desk, 4.95, 0.16, -3.6, 0.65, 0.26, ink);
    this.cylinder(this.desk, 4.95, 1.2, -3.6, 0.07, 2.1, ink);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 0.65, 16, 1, true),
      new THREE.MeshStandardMaterial({
        color: '#d9b379',
        side: THREE.DoubleSide,
      }),
    );
    shade.position.set(4.7, 2.25, -3.5);
    shade.rotation.z = -0.3;
    this.desk.add(shade);
    this.cylinder(this.desk, 4.7, 1.97, -3.5, 0.36, 0.035, '#ffe1a0');
    // Quiet wood grain, confined to the edge of the playing surface.
    for (let i = 0; i < 5; i++)
      this.box(
        this.desk,
        -0.2,
        0.035,
        3.5 + i * 0.14,
        10.9,
        0.006,
        0.013,
        '#ae8462',
      );
  }
  setProgress(evenings: number) {
    disposeGroup(this.decor);
    for (let i = 0; i < 3 - evenings; i++) {
      const note = this.box(
        this.decor,
        5.55,
        0.08 + i * 0.055,
        0.7 + i * 0.38,
        0.8,
        0.04,
        0.85,
        ['#e1c589', '#c9bdab', '#dec9a7'][i],
      );
      note.rotation.y = i * 0.2 - 0.2;
    }
    if (evenings > 0) {
      this.cylinder(this.decor, -5.5, 0.23, 1.8, 0.36, 0.4, '#d1b392');
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(
          new THREE.ConeGeometry(0.22, 0.9, 5),
          new THREE.MeshStandardMaterial({ color: '#6e9274' }),
        );
        leaf.position.set(
          -5.5 + Math.sin(i) * 0.18,
          0.7,
          1.8 + Math.cos(i) * 0.18,
        );
        leaf.rotation.z = Math.sin(i) * 0.4;
        this.decor.add(leaf);
      }
    }
    if (evenings > 1) {
      this.box(this.decor, 5.5, 0.25, 1.6, 0.65, 0.45, 0.65, '#d6a578');
      this.cylinder(this.decor, 5.5, 0.52, 1.6, 0.07, 0.08, '#ffddaa');
    }
  }
  private clearPuzzle() {
    disposeGroup(this.puzzle);
    this.items = new THREE.Group();
    this.ghost = new THREE.Group();
    this.puzzle.add(this.items, this.ghost);
    this.puzzle.position.set(0, 0, 0);
    this.closure = 0;
    this.cables = [];
  }
  showCables(cables: Cable[]) {
    this.clearPuzzle();
    this.mode = 'untangle';
    this.box(this.puzzle, 0, 0.07, 0, 10.1, 0.12, 6.15, '#344745');
    this.box(this.puzzle, 0, 0.19, 2.67, 9, 0.22, 0.43, '#d1c8b6');
    const stickGeometry = new THREE.CylinderGeometry(1, 1, 1, 8),
      jointGeometry = new THREE.SphereGeometry(1, 8, 6);
    cables.forEach((cable, index) => {
      const color = colors[index],
        material = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
      this.box(this.puzzle, cable.start.x, 0.25, -2.7, 0.4, 0.22, 0.38, ink);
      this.box(
        this.puzzle,
        cable.start.x,
        0.38,
        -2.69,
        0.18,
        0.025,
        0.17,
        color,
      );
      this.box(this.puzzle, cable.end.x, 0.34, 2.62, 0.29, 0.2, 0.3, color);
      // Port stripes make endpoints distinguishable without relying on color alone.
      for (let j = 0; j <= index; j++)
        this.box(
          this.puzzle,
          cable.start.x - 0.12 + j * 0.035,
          0.399,
          -2.72,
          0.017,
          0.01,
          0.08,
          '#e9e4d3',
        );
      const sticks = cable.nodes.slice(1).map(() => {
        const m = new THREE.Mesh(stickGeometry, material);
        m.castShadow = true;
        this.puzzle.add(m);
        return m;
      });
      const joints = cable.nodes.map(() => {
        const m = new THREE.Mesh(jointGeometry, material);
        m.castShadow = true;
        this.puzzle.add(m);
        return m;
      });
      this.cables.push({ sticks, joints });
    });
    this.updateCables(cables);
    this.resize();
  }
  updateCables(cables: Cable[]) {
    const up = new THREE.Vector3(0, 1, 0);
    cables.forEach((cable, c) => {
      const meshes = this.cables[c];
      if (!meshes) return;
      cable.nodes.forEach((node, i) => {
        const position = new THREE.Vector3(node.x, 0.29, node.y);
        meshes.joints[i].position.copy(position);
        meshes.joints[i].scale.setScalar(this.radius);
        if (i === 0) return;
        const previous = new THREE.Vector3(
            cable.nodes[i - 1].x,
            0.29,
            cable.nodes[i - 1].y,
          ),
          delta = position.clone().sub(previous),
          mesh = meshes.sticks[i - 1];
        mesh.position.copy(previous.add(position).multiplyScalar(0.5));
        mesh.scale.set(this.radius, delta.length(), this.radius);
        mesh.quaternion.setFromUnitVectors(up, delta.normalize());
      });
    });
  }
  showDrawer(drawer: Drawer) {
    this.clearPuzzle();
    this.mode = 'drawer';
    this.box(
      this.puzzle,
      0,
      0.08,
      0,
      drawer.width + 0.38,
      0.15,
      drawer.depth + 0.38,
      '#5a6a61',
    );
    for (const x of [-1, 1])
      this.box(
        this.puzzle,
        x * (drawer.width / 2 + 0.16),
        0.32,
        0,
        0.2,
        0.55,
        drawer.depth + 0.55,
        '#aa7a56',
      );
    for (const z of [-1, 1])
      this.box(
        this.puzzle,
        0,
        0.32,
        z * (drawer.depth / 2 + 0.16),
        drawer.width + 0.5,
        0.55,
        0.2,
        '#aa7a56',
      );
    this.box(
      this.puzzle,
      0,
      0.38,
      drawer.depth / 2 + 0.35,
      1.3,
      0.12,
      0.14,
      ink,
    );
    for (let x = 0; x < drawer.width; x++)
      for (let z = 0; z < drawer.depth; z++)
        this.box(
          this.puzzle,
          x - drawer.width / 2 + 0.5,
          0.17,
          z - drawer.depth / 2 + 0.5,
          0.95,
          0.025,
          0.95,
          (x + z) % 2 ? '#65766b' : '#6b7d70',
        );
    this.updateItems(drawer);
    this.resize();
  }
  private object(
    group: THREE.Group,
    piece: Piece,
    origin: Cell,
    drawer: Drawer,
    preview = false,
    valid = true,
  ) {
    const color = preview
      ? valid
        ? '#c7e8c4'
        : '#e99783'
      : colors[piece.id % colors.length];
    for (const [x, z, y] of piece.cells) {
      const mesh = this.box(
        group,
        origin[0] + x - drawer.width / 2 + 0.5,
        0.32 + y,
        origin[1] + z - drawer.depth / 2 + 0.5,
        0.94,
        0.27,
        0.94,
        color,
      );
      mesh.userData.piece = piece.id;
      if (preview) {
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.transparent = true;
        m.opacity = 0.58;
        mesh.castShadow = false;
      }
    }
    if (preview) return;
    const [x, z] = piece.cells[0],
      cx = origin[0] + x - drawer.width / 2 + 0.5,
      cz = origin[1] + z - drawer.depth / 2 + 0.5;
    const mark = (dx: number, dz: number, w: number, d: number, c: string) => {
      const m = this.box(group, cx + dx, 0.467, cz + dz, w, 0.035, d, c);
      m.userData.piece = piece.id;
      return m;
    };
    switch (piece.kind) {
      case 'notebook':
        for (let n = 0; n < 4; n++)
          mark(0, -0.22 + n * 0.14, 0.6, 0.018, '#f5ecd9');
        break;
      case 'powerbank':
        for (let n = 0; n < 3; n++) mark(-0.18 + n * 0.16, 0, 0.07, 0.1, ink);
        break;
      case 'mouse':
        mark(0, -0.18, 0.08, 0.2, ink);
        mark(0, 0.15, 0.02, 0.32, ink);
        break;
      case 'usb':
        mark(0, -0.2, 0.52, 0.32, '#c2c8c3');
        mark(-0.12, -0.23, 0.1, 0.1, ink);
        mark(0.12, -0.23, 0.1, 0.1, ink);
        break;
      case 'stapler':
        mark(0, 0, 0.68, 0.4, ink);
        mark(0, 0.24, 0.55, 0.06, '#c9d0c9');
        break;
      case 'adapter':
        mark(-0.16, -0.17, 0.09, 0.28, '#d7ded9');
        mark(0.16, -0.17, 0.09, 0.28, '#d7ded9');
        break;
      case 'scissors':
        mark(0, 0, 0.12, 0.8, '#d5d9c9').rotation.y = 0.48;
        mark(0, 0, 0.12, 0.8, '#d5d9c9').rotation.y = -0.48;
        break;
    }
  }
  updateItems(drawer: Drawer, selected?: number) {
    disposeGroup(this.items);
    drawer.pieces
      .filter((p) => p.position)
      .forEach((p) => {
        this.object(this.items, p, p.position!, drawer);
      });
    this.items.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.piece === selected)
        (o.material as THREE.MeshStandardMaterial).emissive.setHex(0x292a14);
    });
  }
  preview(drawer: Drawer, piece?: Piece, origin?: Cell) {
    disposeGroup(this.ghost);
    if (piece && origin)
      this.object(
        this.ghost,
        piece,
        origin,
        drawer,
        true,
        fits(drawer, piece, origin),
      );
  }
  hitPiece(clientX: number, clientY: number): number | undefined {
    this.setRay(clientX, clientY);
    return this.ray.intersectObjects(this.items.children, false)[0]?.object
      .userData.piece;
  }
  private setRay(x: number, y: number) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((x - r.left) / r.width) * 2 - 1,
        1 - ((y - r.top) / r.height) * 2,
      ),
      this.camera,
    );
  }
  world(x: number, y: number): Point | null {
    this.setRay(x, y);
    const point = this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
    return point ? { x: point.x, y: point.z } : null;
  }
  screen(p: Point): Point {
    const v = new THREE.Vector3(p.x, 0.29, p.y).project(this.camera),
      r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) * r.width) / 2, y: ((1 - v.y) * r.height) / 2 };
  }
  cell(drawer: Drawer, clientX: number, clientY: number): Cell | null {
    const p = this.world(clientX, clientY);
    if (!p) return null;
    return [
      Math.floor(p.x + drawer.width / 2),
      Math.floor(p.y + drawer.depth / 2),
      0,
    ];
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height,
      halfWidth = Math.max(6.6, 4.8 * aspect),
      halfHeight = halfWidth / aspect;
    Object.assign(this.camera, {
      left: -halfWidth,
      right: halfWidth,
      top: halfHeight,
      bottom: -halfHeight,
    });
    this.camera.updateProjectionMatrix();
    this.radius = Math.max(0.065, ((halfWidth * 2) / width) * 3.1);
    this.renderer.setSize(width, height, false);
    this.render(0, false);
  }
  render(dt: number, complete: boolean) {
    this.closure = Math.min(1, this.closure + (complete ? dt * 0.8 : 0));
    if (this.mode === 'drawer' && complete) {
      this.puzzle.position.z = -(this.reduce ? 1 : this.closure) * 1.6;
      this.puzzle.position.y = -(this.reduce ? 1 : this.closure) * 0.85;
    }
    this.lamp.intensity = complete ? 34 : 24;
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect();
    disposeGroup(this.desk);
    disposeGroup(this.decor);
    disposeGroup(this.puzzle);
    this.renderer.dispose();
  }
}
