import '@babylonjs/core/Physics/physicsEngineComponent';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import './ui/style.css';
import { Game } from './Game';
import { initializeSiteAppearance } from './ui/SiteAppearance';
initializeSiteAppearance();
const game = new Game(document.querySelector<HTMLCanvasElement>('#game')!);
void game.start();
if (import.meta.hot)
    import.meta.hot.dispose(() => game.dispose());
