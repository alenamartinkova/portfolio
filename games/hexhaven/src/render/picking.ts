import {
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, PerspectiveCamera } from 'three';
import type { Board } from '../core/board';
import type { BoardPositions } from './positions';
import type { PieceKind } from './pieceMesh';

export interface SceneTarget {
  readonly kind: PieceKind;
  readonly id: string;
}
interface BoardPicking {
  readonly group: Group;
  setTargets(targets: readonly SceneTarget[], select: (target: SceneTarget) => void): void;
  setColor(color: string): void;
  setAccent(color: string): void;
  pulse(time: number, reducedMotion: boolean): void;
  highlight(id: string | null): void;
  dispose(): void;
}
export function createPicking(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  board: Board,
  positions: BoardPositions,
  geometries: Readonly<Record<PieceKind, BufferGeometry>>,
  invalidate: () => void,
): BoardPicking {
  const group = new Group(),
    raycaster = new Raycaster(),
    pointer = new Vector2(),
    dummy = new Object3D();
  const proxyMaterial = new MeshBasicMaterial();
  proxyMaterial.visible = false;
  const proxies = new InstancedMesh(new SphereGeometry(1, 8, 6), proxyMaterial, 72);
  proxies.count = 0;
  proxies.frustumCulled = false;
  group.add(proxies);
  const markerMaterial = new MeshBasicMaterial({
    color: '#9c6bff',
    transparent: true,
    opacity: 0.66,
    depthWrite: false,
  });
  const markers = new InstancedMesh(
    new RingGeometry(0.1, 0.145, 24).rotateX(-Math.PI / 2),
    markerMaterial,
    72,
  );
  markers.count = 0;
  markers.frustumCulled = false;
  group.add(markers);
  const ghostMaterial = new MeshBasicMaterial({
    color: '#9c6bff',
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const ghost = new Mesh(geometries.village, ghostMaterial);
  ghost.visible = false;
  group.add(ghost);
  const halo = new Mesh(
    new RingGeometry(0.36, 0.4, 48).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#9c6bff', transparent: true, opacity: 0.9, depthWrite: false }),
  );
  halo.visible = false;
  group.add(halo);
  let targets: readonly SceneTarget[] = [],
    select: (target: SceneTarget) => void = () => {},
    hovered = -1,
    downX = 0,
    downY = 0;
  const worldPosition = new Vector3();
  const proxyCamera = new Vector3(Infinity, Infinity, Infinity);
  let proxyHeight = -1, proxyFov = -1, proxiesDirty = true;
  function targetPosition(target: SceneTarget): Vector3 | undefined {
    return positions.all.get(target.id);
  }
  function place(object: Object3D, target: SceneTarget, y = 0): void {
    const p = targetPosition(target);
    if (!p) return;
    object.position.set(p.x, y, p.z);
    object.rotation.set(0, 0, 0);
    if (target.kind === 'road') {
      const edge = board.edges.find((e) => e.id === target.id);
      const a = edge ? positions.vertices.get(edge.vertices[0]) : undefined,
        b = edge ? positions.vertices.get(edge.vertices[1]) : undefined;
      if (a && b) object.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    }
  }
  function showHover(index: number): void {
    if (hovered === index) return;
    hovered = index;
    const target = targets[index];
    ghost.visible = target !== undefined;
    canvas.style.cursor = target ? 'pointer' : 'grab';
    if (target) {
      ghost.geometry = geometries[target.kind];
      place(ghost, target);
    }
    invalidate();
  }
  function sizeProxies(): void {
    const height = canvas.clientHeight || 600;
    if (!proxiesDirty && proxyHeight === height && proxyFov === camera.fov && proxyCamera.equals(camera.position)) return;
    proxiesDirty = false; proxyHeight = height; proxyFov = camera.fov; proxyCamera.copy(camera.position);
    for (let index = 0; index < targets.length; index++) {
      const target = targets[index];
      if (!target) continue;
      place(dummy, target, 0.27);
      const distance = camera.position.distanceTo(dummy.position);
      // 48 px leaves a margin for the proxy sphere's low-poly silhouette.
      const radius = Math.max(
        0.24,
        (24 * distance * 2 * Math.tan((camera.fov * Math.PI) / 360)) / height,
      );
      dummy.scale.setScalar(target.kind === 'bandit' ? Math.max(radius, 0.4) : radius);
      dummy.updateMatrix();
      proxies.setMatrixAt(index, dummy.matrix);
    }
    proxies.instanceMatrix.needsUpdate = true;
    proxies.computeBoundingSphere();
    proxies.updateMatrixWorld();
  }
  function hit(event: PointerEvent): number {
    if (!targets.length) return -1;
    sizeProxies();
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObject(proxies, false);
    let nearest = -1,
      nearestDistance = Infinity;
    // Enlarged mobile proxies can overlap. Select the closest visible marker.
    for (const intersection of intersections) {
      const index = intersection.instanceId;
      const target = index === undefined ? undefined : targets[index];
      const center = target ? targetPosition(target) : undefined;
      if (index === undefined || !center) continue;
      worldPosition.copy(center);
      worldPosition.y = 0.27;
      worldPosition.project(camera);
      const dx = (worldPosition.x - pointer.x) * rect.width;
      const dy = (worldPosition.y - pointer.y) * rect.height;
      const distance = dx * dx + dy * dy;
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    }
    return nearest;
  }
  function pointerMove(event: PointerEvent): void {
    if (event.buttons === 0) showHover(hit(event));
  }
  function pointerDown(event: PointerEvent): void {
    downX = event.clientX;
    downY = event.clientY;
  }
  function pointerUp(event: PointerEvent): void {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > 7) return;
    const index = hit(event),
      target = targets[index];
    if (target) {
      showHover(index);
      select(target);
    }
  }
  function pointerLeave(): void {
    showHover(-1);
  }
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointerleave', pointerLeave);
  function setTargets(next: readonly SceneTarget[], callback: (target: SceneTarget) => void): void {
    targets = next;
    proxiesDirty = true;
    select = callback;
    hovered = -1;
    ghost.visible = false;
    proxies.count = next.length;
    markers.count = next.length;
    next.forEach((target, index) => {
      place(dummy, target, 0.205);
      dummy.scale.setScalar(target.kind === 'bandit' ? 2 : 1);
      dummy.updateMatrix();
      markers.setMatrixAt(index, dummy.matrix);
    });
    markers.instanceMatrix.needsUpdate = true;
    sizeProxies();
    invalidate();
  }
  function highlight(id: string | null): void {
    showHover(id === null ? -1 : targets.findIndex((target) => target.id === id));
    const p = id ? positions.all.get(id) : undefined;
    halo.visible = p !== undefined;
    if (p) halo.position.set(p.x, 0.27, p.z);
    invalidate();
  }
  return {
    group,
    setTargets,
    highlight,
    setAccent: (color) => {
      markerMaterial.color.set(color);
      halo.material.color.set(color);
    },
    setColor: (color) => {
      ghostMaterial.color.set(new Color(color));
    },
    pulse: (time, reduced) => {
      markerMaterial.opacity = reduced ? 0.72 : 0.56 + Math.sin(time * 4) * 0.15;
    },
    dispose: () => {
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointerleave', pointerLeave);
    },
  };
}
