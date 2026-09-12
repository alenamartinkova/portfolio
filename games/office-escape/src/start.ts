import '@babylonjs/core/Physics/physicsEngineComponent';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import './ui/style.css';
import { Game } from './Game';
export async function start(signal?: AbortSignal) {
  if (signal?.aborted) return;
  const game = new Game(document.querySelector<HTMLCanvasElement>('#game')!);
  const abort = () => game.dispose();
  signal?.addEventListener('abort', abort, { once: true });
  const disposeGame = () => { signal?.removeEventListener('abort', abort); game.dispose(); };
  try { await game.start(); } catch (error) { disposeGame(); throw error; }
  if (signal?.aborted) { disposeGame(); return; }
  return disposeGame;
}
