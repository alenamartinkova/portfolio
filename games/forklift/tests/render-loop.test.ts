import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Game } from '../src/Game';

vi.mock('../src/ui/UI', () => ({ UI: class {
  ready = vi.fn(); paused = vi.fn(); dispose = vi.fn();
} }));
vi.mock('../src/systems/Input', () => ({ Input: class {
  setActive = vi.fn(); dispose = vi.fn();
} }));
vi.mock('../src/systems/Audio', () => ({ GameAudio: class {
  update = vi.fn(); dispose = vi.fn();
} }));

beforeEach(() => {
  vi.stubGlobal('location', { search: '?qa' });
  vi.stubGlobal('document', { hidden: false, querySelector: () => ({}), removeEventListener: vi.fn() });
  vi.stubGlobal('window', { removeEventListener: vi.fn() });
  vi.stubGlobal('MutationObserver', class { disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

function rig() {
  const game = new Game({ focus: vi.fn() } as unknown as HTMLCanvasElement);
  const engine = {
    performanceMonitor: { reset: vi.fn() },
    runRenderLoop: vi.fn<(callback: () => void) => void>(),
    stopRenderLoop: vi.fn(),
    getDeltaTime: () => 33.333,
    dispose: vi.fn(),
  };
  const scene = { physicsEnabled: true, render: vi.fn(), dispose: vi.fn() };
  game.engine = engine as unknown as Game['engine'];
  game.scene = scene as unknown as Game['scene'];
  game.truck = { speed: 0, hydraulic: 0 } as Game['truck'];
  const controls = game as unknown as { requestRender(): void; visibility(): void };
  const frame = () => engine.runRenderLoop.mock.calls.at(-1)![0]();
  return { game, engine, scene, controls, frame };
}

it('draws a paused view once, then cancels the engine loop and disables physics', () => {
  const { game, engine, scene, frame } = rig();
  game.togglePause();
  expect(engine.runRenderLoop).toHaveBeenCalledTimes(1);
  frame();
  expect(scene.render).toHaveBeenCalledTimes(1);
  expect(scene.physicsEnabled).toBe(false);
  expect(engine.stopRenderLoop).toHaveBeenCalledWith(engine.runRenderLoop.mock.calls[0][0]);
});

it('coalesces paused view changes and resets the clock when resuming after a stop', () => {
  const { game, engine, scene, controls, frame } = rig();
  game.togglePause();
  frame();
  controls.requestRender();
  controls.requestRender();
  expect(engine.runRenderLoop).toHaveBeenCalledTimes(2);
  expect(engine.performanceMonitor.reset).toHaveBeenCalledTimes(2);
  frame();
  expect(scene.render).toHaveBeenCalledTimes(2);
  game.togglePause();
  expect(engine.runRenderLoop).toHaveBeenCalledTimes(3);
  expect(engine.performanceMonitor.reset).toHaveBeenCalledTimes(3);
});

it('keeps a hidden page stopped and redraws the paused view when it becomes visible', () => {
  const { game, engine, controls, frame } = rig();
  game.togglePause();
  frame();
  Object.assign(document, { hidden: true });
  controls.visibility();
  controls.requestRender();
  expect(engine.runRenderLoop).toHaveBeenCalledTimes(1);
  Object.assign(document, { hidden: false });
  controls.visibility();
  expect(engine.runRenderLoop).toHaveBeenCalledTimes(2);
  frame();
  expect(engine.stopRenderLoop).toHaveBeenCalledTimes(3);
});

it('does not restart rendering from a late readiness callback after disposal', () => {
  const { game, engine, controls } = rig();
  game.dispose();
  controls.requestRender();
  expect(engine.runRenderLoop).not.toHaveBeenCalled();
});
