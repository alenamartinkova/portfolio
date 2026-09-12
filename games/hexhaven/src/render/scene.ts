import { createRenderLoop } from '../../../../shared/render-loop.js';
import { renderBudget, renderPixelRatio } from '../../../../shared/render-budget.js';
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Mesh,
  PCFSoftShadowMap,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Material } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Board } from '../core/board';
import type { GameState } from '../core/state';
import { localize } from '../i18n';
import { createBoardMeshes } from './boardMesh';
import { createFx } from './fx';
import { ACCESSIBLE_COLORS, PLAYER_COLORS } from './materials';
import { createPieceMeshes } from './pieceMesh';
import { createPicking } from './picking';
import type { SceneTarget } from './picking';
import { createPositions } from './positions';
import { DEFAULT_APPEARANCE } from './appearance';
import type { BoardAppearance } from './appearance';

export type { SceneTarget } from './picking';
export type { BoardAppearance } from './appearance';
export interface BoardScene {
  setAppearance(appearance: BoardAppearance): void;
  refreshLocale(): void;
  update(state: GameState): void;
  setTargets(targets: readonly SceneTarget[], onSelect: (target: SceneTarget) => void): void;
  highlight(id: string | null): void;
  focus(id: string): void;
  setSettings(settings: { reducedMotion: boolean; speed: number; colorBlind: boolean }): void;
  project(id: string): { x: number; y: number } | null;
  metrics(): { drawCalls: number; triangles: number; frames: number; frameMs: number };
  dispose(): void;
}
export function createBoardScene(container: HTMLElement, board: Board): BoardScene {
  const renderer = new WebGLRenderer({
    antialias: renderBudget.antialias,
    alpha: false,
    powerPreference: 'low-power',
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = renderBudget.shadows;
  renderer.shadowMap.type = PCFSoftShadowMap;
  // The light and board are static. Refresh shadows when pieces change or
  // dice animate, rather than for every sea shimmer and camera movement.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.className = 'hexhaven-canvas';
  function updateCanvasLabel(): void {
    renderer.domElement.setAttribute(
      'aria-label',
      localize(
        'Hexhaven board. Use the placement list or Tab and Enter to choose a legal location.',
        'Herná doska Hexhaven. Vyberte povolené miesto zo zoznamu alebo klávesmi Tab a Enter.',
      ),
    );
  }
  updateCanvasLabel();
  renderer.domElement.style.cssText =
    'display:block;width:100%;height:100%;touch-action:none;outline:none';
  container.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(DEFAULT_APPEARANCE.background);
  scene.fog = new FogExp2(DEFAULT_APPEARANCE.background, 0.022);
  const camera = new PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 11.2, 14.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.minPolarAngle = Math.PI / 9;
  controls.maxPolarAngle = (Math.PI * 7) / 18;
  controls.minDistance = 8;
  controls.maxDistance = 22;
  controls.enablePan = true;
  controls.panSpeed = 0.25;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.target.set(0, 0, 0);
  controls.update();
  const key = new DirectionalLight('#ffffff', 3.1);
  key.position.set(-5, 11, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(renderBudget.shadowSize, renderBudget.shadowSize);
  key.shadow.camera.left = -6.6;
  key.shadow.camera.right = 6.6;
  key.shadow.camera.top = 6.6;
  key.shadow.camera.bottom = -6.6;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.bias = -0.00022;
  key.shadow.normalBias = 0.025;
  key.shadow.radius = 3;
  scene.add(key);
  const fill = new HemisphereLight('#dfe4ff', '#373243', 2);
  scene.add(fill);
  const rim = new DirectionalLight('#cfbde7', 0.8);
  rim.position.set(5, 6, -6);
  scene.add(rim);
  const positions = createPositions(board),
    boardMeshes = createBoardMeshes(board, positions),
    pieces = createPieceMeshes(board, positions),
    fx = createFx(positions, camera);
  scene.add(boardMeshes.group, pieces.group, fx.group);
  let state: GameState | null = null,
    reducedMotion = false,
    speed = 1,
    colorBlind = false,
    disposed = false,
    dirty = true,
    frames = 0,
    frameMs = 0,
    activeUntil = 0;
  const renderLoop = createRenderLoop(frame);
  const focusStart = new Vector3(),
    focusEnd = new Vector3(),
    projected = new Vector3();
  let focusElapsed = 1,
    focusDuration = 0.6;
  function invalidate(): void {
    dirty = true;
    activeUntil = performance.now() / 1000 + 0.24;
    renderLoop.request();
  }
  const picking = createPicking(
    renderer.domElement,
    camera,
    board,
    positions,
    pieces.geometries,
    invalidate,
  );
  scene.add(picking.group);
  function frame(now: number, elapsed: number): void {
    if (disposed || document.hidden) return;
    const start = performance.now(),
      time = now / 1000,
      delta = Math.min(0.05, elapsed);
    if (focusElapsed < focusDuration) {
      focusElapsed = Math.min(focusDuration, focusElapsed + delta);
      const t = focusElapsed / focusDuration,
        ease = t * t * (3 - 2 * t);
      controls.target.lerpVectors(focusStart, focusEnd, ease);
      dirty = true;
    }
    controls.target.x = Math.max(-0.65, Math.min(0.65, controls.target.x));
    controls.target.z = Math.max(-0.65, Math.min(0.65, controls.target.z));
    controls.target.y = 0;
    const cameraChanged = controls.update();
    // Apply the pan limit after OrbitControls consumes its pending gesture too.
    const panX = controls.target.x - Math.max(-0.65, Math.min(0.65, controls.target.x));
    const panZ = controls.target.z - Math.max(-0.65, Math.min(0.65, controls.target.z));
    if (panX || panZ || controls.target.y) {
      camera.position.x -= panX;
      camera.position.z -= panZ;
      camera.position.y -= controls.target.y;
      controls.target.x -= panX;
      controls.target.z -= panZ;
      controls.target.y = 0;
    }
    const effectActive = fx.tick(delta, time);
    if (effectActive) renderer.shadowMap.needsUpdate = true;
    boardMeshes.seaTime.value = reducedMotion ? 0 : time;
    picking.pulse(time, reducedMotion);
    const shake = fx.cameraShake(time);
    renderer.domElement.style.transform = shake ? `translateX(${shake}px)` : '';
    if (dirty || cameraChanged || effectActive || !reducedMotion) {
      renderer.render(scene, camera);
      frames++;
      frameMs = frameMs * 0.9 + (performance.now() - start) * 0.1;
      dirty = false;
    }
    const active =
      effectActive ||
      cameraChanged ||
      focusElapsed < focusDuration ||
      time < activeUntil;
    if (active) renderLoop.request();
  }
  function resize(): void {
    const width = Math.max(1, container.clientWidth),
      height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(renderPixelRatio(width, height, window.devicePixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const compact = window.matchMedia(
      '(max-width: 760px), (max-width: 1000px) and (max-height: 600px)',
    ).matches;
    fx.setCompactLayout(compact);
    if (compact) {
      // The mobile canvas occupies a dedicated row, with no HUD over the island.
      camera.fov = Math.max(
        38,
        (2 * Math.atan(Math.tan((19 * Math.PI) / 180) / camera.aspect) * 180) / Math.PI,
      );
      camera.clearViewOffset();
    } else {
      const availableScale = Math.min(1, Math.max(0.45, (height - 348) / (0.6 * height)));
      camera.fov = (2 * Math.atan(Math.tan((19 * Math.PI) / 180) / availableScale) * 180) / Math.PI;
      camera.setViewOffset(width, height, 0, 0.075 * height * availableScale - 2, width, height);
    }
    camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    // A tall viewport keeps the entire island inside the narrow horizontal view.
    if (width < 600 && camera.position.length() < 16) camera.position.setLength(16);
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  controls.addEventListener('change', invalidate);
  controls.addEventListener('start', invalidate);
  resize();
  function focus(id: string): void {
    const point = positions.all.get(id);
    if (!point) return;
    focusStart.copy(controls.target);
    focusEnd.copy(point).multiplyScalar(0.14);
    focusEnd.y = 0;
    focusEnd.clampScalar(-0.65, 0.65);
    focusElapsed = 0;
    focusDuration = reducedMotion ? 0.001 : 0.6 / speed;
    invalidate();
  }
  function update(next: GameState): void {
    if (next === state) return;
    pieces.update(next);
    renderer.shadowMap.needsUpdate = true;
    fx.update(state, next, reducedMotion, speed);
    const last = next.actions[next.actions.length - 1];
    if (state && last && next.actions.length !== state.actions.length) {
      if (last.type === 'moveBandit') focus(last.tile);
      else if (
        (last.type === 'placeRoad' || last.type === 'placeVillage' || last.type === 'buildTown') &&
        next.players[last.player]?.kind === 'bot'
      )
        focus('edge' in last ? last.edge : last.vertex);
    }
    state = next;
    picking.setColor(
      (colorBlind ? ACCESSIBLE_COLORS : PLAYER_COLORS)[next.activePlayer] ?? PLAYER_COLORS[0],
    );
    invalidate();
  }
  function dispose(): void {
    disposed = true;
    renderLoop.dispose();
    observer.disconnect();
    controls.removeEventListener('change', invalidate);
    controls.removeEventListener('start', invalidate);
    controls.dispose();
    picking.dispose();
    boardMeshes.dispose();
    const geometries = new Set<import('three').BufferGeometry>(),
      materials = new Set<Material>();
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        geometries.add(object.geometry);
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => materials.add(m));
        else materials.add(material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }
  let currentAppearance = DEFAULT_APPEARANCE;
  function setAppearance(appearance: BoardAppearance): void {
    if (
      appearance.background === currentAppearance.background &&
      appearance.surface === currentAppearance.surface &&
      appearance.accent === currentAppearance.accent &&
      appearance.text === currentAppearance.text &&
      appearance.theme === currentAppearance.theme
    )
      return;
    currentAppearance = appearance;
    if (scene.background instanceof Color) scene.background.set(appearance.background);
    scene.fog?.color.set(appearance.background);
    fill.groundColor.set(appearance.theme === 'dark' ? '#373243' : '#9196a8');
    boardMeshes.setAppearance(appearance);
    fx.setAppearance(appearance);
    picking.setAccent(appearance.accent);
    invalidate();
  }
  return {
    setAppearance,
    refreshLocale: () => {
      updateCanvasLabel();
      boardMeshes.refreshLocale();
      invalidate();
    },
    update,
    focus,
    dispose,
    highlight: picking.highlight,
    setTargets: (targets, onSelect) => {
      picking.setTargets(targets, onSelect);
    },
    setSettings: (settings) => {
      reducedMotion = settings.reducedMotion;
      speed = Math.max(0.25, Math.min(4, settings.speed));
      colorBlind = settings.colorBlind;
      pieces.setColorBlind(colorBlind);
      if (state)
        picking.setColor(
          (colorBlind ? ACCESSIBLE_COLORS : PLAYER_COLORS)[state.activePlayer] ?? PLAYER_COLORS[0],
        );
      invalidate();
    },
    project: (id) => {
      const p = positions.all.get(id);
      if (!p) return null;
      projected.copy(p);
      projected.y = 0.35;
      projected.project(camera);
      const bounds = container.getBoundingClientRect();
      return {
        x: bounds.left + (projected.x * 0.5 + 0.5) * bounds.width,
        y: bounds.top + (-0.5 * projected.y + 0.5) * bounds.height,
      };
    },
    metrics: () => ({
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      frames,
      frameMs,
    }),
  };
}
