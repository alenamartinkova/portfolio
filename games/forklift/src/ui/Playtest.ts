import type { Game } from "../Game";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
// Development-only input driver: uses exactly the same command stream as the keyboard.
// It never teleports bodies or overrides mission state.
export function mountPlaytest(game: Game) {
  const panel = document.createElement("div");
  panel.id = "playtest";
  panel.style.cssText =
    "position:fixed;left:20px;top:315px;z-index:20;background:#102330e8;padding:10px;color:white;font:12px monospace;max-width:420px;font-size:10px";
  panel.innerHTML =
    '<label>Playtest commands <input aria-label="Playtest commands" value="W:0.6 Space:0.6" style="width:210px"></label> <button>Run commands</button><pre aria-label="Physics telemetry"></pre>';
  document.body.append(panel);
  let running = false;
  panel.querySelector("button")!.onclick = async () => {
    if (running) return;
    running = true;
    const commands = panel.querySelector("input")!.value.trim().split(/\s+/);
    for (const command of commands) {
      const [keys, duration] = command.split(":");
      await game.playtestInput(
        keys.split("+"),
        Math.min(15, Math.max(0, Number(duration) || 0)),
      );
    }
    running = false;
  };
  const interval = setInterval(() => {
    if (game.truck) {
      const f = (n: number) => n.toFixed(2);
      panel.querySelector("pre")!.textContent = JSON.stringify(
        {
          running,
          fps: Math.round(game.engine.getFps()),
          renderedFrames: game.scene.getFrameId(),
          renderSize: [game.engine.getRenderWidth(), game.engine.getRenderHeight()],
          truck: game.truck.root.position.asArray().map(f),
          yaw: f(Math.atan2(game.truck.forward.x, game.truck.forward.z)),
          cargo: game.cargo.root.position.asArray().map(f),
          upright: f(game.cargo.root.getDirection(Vector3.Up()).y),
          fork: game.truck.forkRoot.position.asArray().map(f),
          camera: game.camera.camera.position.asArray().map(f),
          ...game.stats,
        },
        null,
        1,
      );
    }
  }, 200);
  return () => {
    clearInterval(interval);
    panel.remove();
  };
}
