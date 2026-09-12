import '@babylonjs/core/Physics/physicsEngineComponent';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import './ui/style.css';
import { Game } from './Game';
export async function start() {
  const game = new Game(document.querySelector<HTMLCanvasElement>('#game')!);
  try { await game.start(); } catch (error) { game.dispose(); throw error; }
  return () => game.dispose();
}
