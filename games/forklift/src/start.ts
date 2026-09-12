import "./ui/style.css";
import { Game } from "./Game";
export async function start(signal?: AbortSignal) {
  if (signal?.aborted) return;
  const game = new Game(document.querySelector<HTMLCanvasElement>('#game')!);
  const abort = () => game.dispose();
  signal?.addEventListener('abort', abort, { once: true });
  const disposeGame = () => { signal?.removeEventListener('abort', abort); game.dispose(); };
  try { await game.start(); } catch (error) { disposeGame(); throw error; }
  if (signal?.aborted) { disposeGame(); return; }
  let cleanup: (() => void) | undefined, disposed = false;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
    void import('./ui/Playtest').then(module => { if (!disposed) cleanup = module.mountPlaytest(game); });
  }
  return () => { disposed = true; cleanup?.(); disposeGame(); };
}
