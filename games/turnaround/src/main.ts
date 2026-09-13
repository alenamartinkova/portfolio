import { loadGame } from "../../../shared/load-game.js";
import {
  initializeAppearance,
  readPreference,
} from "../../../shared/appearance.js";
initializeAppearance();
const dispose = loadGame({
  title: "Turnaround",
  locale: readPreference("locale", "en"),
  load: (signal: AbortSignal) =>
    matchMedia("(pointer: coarse)").matches &&
    !matchMedia("(any-pointer: fine)").matches
      ? import("./desktop").then((module) => module.start())
      : import("./application").then((module) => module.start(signal)),
});
if (import.meta.hot) import.meta.hot.dispose(dispose);
