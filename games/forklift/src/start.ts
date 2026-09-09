import "./ui/style.css";
import { Game } from "./Game";
const game = new Game(document.querySelector<HTMLCanvasElement>("#game")!);
void game.start();
let cleanup: (() => void) | undefined;
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa"))
  import("./ui/Playtest").then((m) => {
    cleanup = m.mountPlaytest(game);
  });
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cleanup?.();
    game.dispose();
  });
