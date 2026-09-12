import "./ui/style.css";
import { Game } from "./Game";
export async function start() {
  const game = new Game(document.querySelector<HTMLCanvasElement>('#game')!);
  try { await game.start(); } catch (error) { game.dispose(); throw error; }
  let cleanup: (() => void) | undefined, disposed = false;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('qa')) {
    void import('./ui/Playtest').then(module => { if (!disposed) cleanup = module.mountPlaytest(game); });
  }
  return () => { disposed = true; cleanup?.(); game.dispose(); };
}
