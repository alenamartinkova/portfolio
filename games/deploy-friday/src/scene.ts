import { renderBudget, renderPixelRatio } from '../../../shared/render-budget.js';
import * as THREE from 'three';
import { DB, HEIGHT, position, REQUESTS, SERVICES, START, WIDTH, type State } from './core/simulation';

export class ClusterScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-9, 9, 6, -6, .1, 100);
  private tiles: THREE.Mesh[] = [];
  private buildings = new THREE.Group();
  private rays = new THREE.Group();
  private packets: THREE.InstancedMesh;
  private selection: THREE.Mesh;
  private range: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dummy = new THREE.Object3D();
  private signature = '';
  private observer: ResizeObserver;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private hovered: number | null = null;
  selected: number | null = null;
  onInvalidate: () => void = () => {};
  onSelect: (cell: number) => void = () => {};
  onHover: (cell: number | null) => void = () => {};
  constructor(private host: HTMLElement, private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: renderBudget.antialias, alpha: true, powerPreference: 'low-power' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera.position.set(12, 15, 15); this.camera.lookAt(0, 0, 0);
    this.scene.add(new THREE.HemisphereLight(0xbac5ff, 0x24223f, 2.2));
    const light = new THREE.DirectionalLight(0xd9d0ff, 3); light.position.set(-4, 10, 4); this.scene.add(light);
    const rim = new THREE.PointLight(0x9b7bff, 45, 20); rim.position.set(2, 4, -3); this.scene.add(rim);
    const base = new THREE.Mesh(new THREE.BoxGeometry(11.5, .45, 7.5), this.material(0x171925));
    base.position.y = -.4; this.scene.add(base);
    const geometry = new THREE.BoxGeometry(.94, .18, .94);
    for (let cell = 0; cell < WIDTH * HEIGHT; cell++) {
      const tile = new THREE.Mesh(geometry, this.material(0x262b3d));
      tile.position.set(cell % WIDTH - 5, -.08, Math.floor(cell / WIDTH) - 3);
      tile.userData.cell = cell; this.tiles.push(tile); this.scene.add(tile);
    }
    this.scene.add(this.buildings, this.rays);
    this.packets = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ roughness: .25, metalness: .35, emissive: 0xffffff, emissiveIntensity: .35 }), 900);
    this.packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.packets.count = 0;
    this.packets.frustumCulled = false; this.scene.add(this.packets);
    this.selection = new THREE.Mesh(new THREE.BoxGeometry(.99, .04, .99),
      new THREE.MeshBasicMaterial({ color: 0xb89aff, transparent: true, opacity: .65 }));
    this.selection.visible = false; this.scene.add(this.selection);
    this.range = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 80),
      new THREE.MeshBasicMaterial({ color: 0xb89aff, side: THREE.DoubleSide, transparent: true, opacity: .5 }));
    this.range.rotation.x = -Math.PI / 2; this.range.visible = false; this.scene.add(this.range);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host);
    canvas.addEventListener('pointermove', this.move);
    canvas.addEventListener('pointerleave', this.leave);
    canvas.addEventListener('pointerdown', this.click);
    canvas.addEventListener('keydown', this.key);
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); host.dispatchEvent(new CustomEvent('renderlost')); });
    this.resize();
  }
  private material(color: number) { return new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .18 }); }
  private resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    this.renderer.setPixelRatio(renderPixelRatio(w, h, devicePixelRatio));
    this.renderer.setSize(w, h, false);
    const aspect = w / h, view = Math.max(6.5, 8.3 / aspect);
    this.camera.left = -view * aspect; this.camera.right = view * aspect;
    this.camera.top = view; this.camera.bottom = -view; this.camera.updateProjectionMatrix();
    this.onInvalidate();
  }
  private pick(event: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.tiles)[0]?.object.userData.cell as number | undefined;
  }
  private move = (event: PointerEvent) => {
    const next = this.pick(event) ?? null;
    if (next === this.hovered) return;
    this.hovered = next; this.onHover(next); this.onInvalidate();
  };
  private leave = () => { this.hovered = null; this.onHover(null); this.onInvalidate(); };
  private click = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const cell = this.pick(event);
    if (cell !== undefined) { this.selected = cell; this.canvas.focus(); this.onSelect(cell); }
  };
  private key = (event: KeyboardEvent) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -WIDTH, ArrowDown: WIDTH };
    if (event.key in offsets) {
      event.preventDefault(); this.selected = Math.max(0, Math.min(WIDTH * HEIGHT - 1, (this.selected ?? 35) + offsets[event.key]));
      this.onSelect(this.selected);
    } else if (event.key === 'Enter') { event.preventDefault(); this.onSelect(this.selected ?? 35); }
  };
  project(cell: number, height = .4) {
    const v = new THREE.Vector3(cell % WIDTH - 5, height, Math.floor(cell / WIDTH) - 3).project(this.camera);
    return { x: (v.x + 1) / 2 * this.host.clientWidth, y: (1 - v.y) / 2 * this.host.clientHeight };
  }
  private clear(group: THREE.Object3D) {
    for (const child of [...group.children]) {
      child.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(m => m.dispose());
        }
      });
      group.remove(child);
    }
  }
  private building(cell: number, color: number, kind: string, level = 1) {
    const group = new THREE.Group(); group.position.set(cell % WIDTH - 5, 0, Math.floor(cell / WIDTH) - 3); group.userData.cell = cell;
    const add = (geometry: THREE.BufferGeometry, y: number, material: THREE.Material = this.material(color)) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.y = y; group.add(mesh); return mesh;
    };
    add(new THREE.BoxGeometry(.78, .08, .78), .1, this.material(0x35384c));
    if (kind === 'db') {
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(.52, .52, .23, 6), .28 + i * .29);
      add(new THREE.CylinderGeometry(.44, .44, .025, 6), 1, new THREE.MeshBasicMaterial({ color: 0xc5b0ff }));
    } else if (kind === 'cache') {
      for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(.3, .3, .14, 24), .22 + i * .19);
    } else if (kind === 'balancer') {
      const mesh = add(new THREE.OctahedronGeometry(.42), .55); mesh.rotation.z = Math.PI / 4;
    } else if (kind === 'limiter') {
      add(new THREE.BoxGeometry(.65, .65, .18), .45);
      add(new THREE.BoxGeometry(.48, .08, .2), .5, new THREE.MeshBasicMaterial({ color: 0xffe4ad }));
    } else if (kind === 'autoscaler') {
      add(new THREE.CylinderGeometry(.22, .35, .4, 6), .35);
      add(new THREE.ConeGeometry(.35, .35, 4), .77);
    } else if (kind === 'ingress') {
      add(new THREE.TorusGeometry(.32, .065, 8, 32), .5).rotation.y = Math.PI / 2;
    } else {
      for (let i = 0; i < (kind === 'queue' ? 3 : level); i++) {
        const box = add(new THREE.BoxGeometry(.65, .23, .56), .25 + i * .28);
        if (kind === 'queue') box.position.x = (i - 1) * .07;
        const led = add(new THREE.BoxGeometry(.45, .025, .015), .25 + i * .28,
          new THREE.MeshBasicMaterial({ color: 0xe0d5ff })); led.position.z = .287;
      }
    }
    for (let i = 0; i < level; i++) {
      const dot = add(new THREE.SphereGeometry(.035, 8, 6), .16, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dot.position.set(-.22 + i * .13, .16, .36);
    }
    this.buildings.add(group);
  }
  render(s: State, previewRange = 0) {
    const signature = s.towers.map(t => `${t.cell}:${t.kind}:${t.level}`).join('|');
    if (signature !== this.signature || !this.buildings.children.length) {
      this.signature = signature; this.clear(this.buildings);
      this.building(DB, 0x9b7bff, 'db'); this.building(START, 0x50dec0, 'ingress');
      for (const t of s.towers) this.building(t.cell, SERVICES[t.kind].color, t.kind, t.level);
    }
    const path = new Set<number>(); let cell = START;
    for (let i = 0; i < WIDTH * HEIGHT && cell !== DB; i++) {
      path.add(cell);
      const x = cell % WIDTH, y = Math.floor(cell / WIDTH);
      cell = [x < 10 ? cell + 1 : -1, y > 0 ? cell - WIDTH : -1, y < 6 ? cell + WIDTH : -1, x > 0 ? cell - 1 : -1]
        .find(c => c >= 0 && s.fields[DB][c] >= 0 && s.fields[DB][c] < s.fields[DB][cell]) ?? DB;
    }
    for (let i = 0; i < this.tiles.length; i++) {
      const mat = this.tiles[i].material as THREE.MeshStandardMaterial;
      mat.color.setHex(path.has(i) ? 0x354456 : [16, 60].includes(i) ? 0x2c354a : (i + Math.floor(i / WIDTH)) % 2 ? 0x242837 : 0x292e40);
      mat.emissive.setHex(path.has(i) ? 0x132b2b : 0x000000); mat.emissiveIntensity = .3;
    }
    const selected = this.hovered ?? this.selected;
    this.selection.visible = selected !== null;
    if (selected !== null) this.selection.position.set(selected % WIDTH - 5, .045, Math.floor(selected / WIDTH) - 3);
    const rangeCell = this.selected;
    const tower = s.towers.find(t => t.cell === rangeCell);
    const range = tower ? SERVICES[tower.kind].range : previewRange;
    this.range.visible = rangeCell !== null && range > 0;
    if (rangeCell !== null) {
      this.range.position.set(rangeCell % WIDTH - 5, .065, Math.floor(rangeCell / WIDTH) - 3);
      this.range.scale.setScalar(range);
    }
    this.packets.count = s.packets.length;
    s.packets.forEach((p, i) => {
      const pos = position(p), size = p.kind === 'upload' ? .43 : p.kind === 'bot' ? .15 : .23;
      this.dummy.position.set(pos.x - 5, .3 + (this.reducedMotion ? 0 : Math.sin(s.tick * .08 + p.id) * .04), pos.y - 3 + ((p.id % 3) - 1) * .12);
      this.dummy.scale.setScalar(size); this.dummy.rotation.set(0, this.reducedMotion ? 0 : s.tick * .02, 0);
      this.dummy.updateMatrix(); this.packets.setMatrixAt(i, this.dummy.matrix);
      const color = new THREE.Color(REQUESTS[p.kind].color);
      if (p.kind === 'get') color.offsetHSL((p.color - 1.5) * .022, 0, 0);
      this.packets.setColorAt(i, color);
    });
    this.packets.instanceMatrix.needsUpdate = true;
    if (this.packets.instanceColor) this.packets.instanceColor.needsUpdate = true;
    for (const group of this.buildings.children) {
      const t = s.towers.find(t => t.cell === group.userData.cell);
      group.visible = !t || t.offline <= s.tick || this.reducedMotion || Math.floor(s.tick / 4) % 2 === 0;
      group.position.y = t?.active && !this.reducedMotion ? Math.sin(s.tick * .12) * .04 : 0;
      for (const child of group.children) if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(t?.jammed ? 0xff3344 : t?.active ? 0x698940 : 0);
        child.material.emissiveIntensity = .45;
      }
    }
    // One shared line geometry per update, instead of one draw call per target.
    if (s.tick !== this.rays.userData.tick) {
      this.rays.userData.tick = s.tick; this.clear(this.rays);
      const vertices: number[] = [], colors: number[] = [];
      for (const t of s.towers) for (const id of t.targets) {
        const p = s.packets.find(p => p.id === id); if (!p) continue;
        const pos = position(p), color = new THREE.Color(SERVICES[t.kind].color);
        vertices.push(t.cell % WIDTH - 5, .5, Math.floor(t.cell / WIDTH) - 3, pos.x - 5, .3, pos.y - 3);
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      this.rays.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .55 })));
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.observer.disconnect(); this.clear(this.scene);
    this.renderer.dispose();
    this.canvas.removeEventListener('pointermove', this.move); this.canvas.removeEventListener('pointerleave', this.leave);
    this.canvas.removeEventListener('pointerdown', this.click); this.canvas.removeEventListener('keydown', this.key);
  }
}
