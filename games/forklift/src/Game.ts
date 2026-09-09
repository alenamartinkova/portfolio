import {
  levels,
  resolveLevel,
  type MissionDefinition,
} from "./missions/levels";
import { AbstractEngine } from "@babylonjs/core/Engines/abstractEngine";
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import glslangJs from "@babylonjs/core/assets/glslang/glslang.js?url";
import glslangWasm from "@babylonjs/core/assets/glslang/glslang.wasm?url";
import twgslJs from "@babylonjs/core/assets/twgsl/twgsl.js?url";
import twgslWasm from "@babylonjs/core/assets/twgsl/twgsl.wasm?url";
import { enablePhysics } from "./systems/Physics";
import { Factory } from "./world/Factory";
import { Warehouse } from "./world/Warehouse";
import { Cargo } from "./world/Cargo";
import { ForkliftController } from "./player/ForkliftController";
import { FollowCamera } from "./player/FollowCamera";
import { Input } from "./systems/Input";
import { DamageSystem } from "./systems/DamageSystem";
import { MissionManager } from "./systems/MissionManager";
import { GameAudio } from "./systems/Audio";
import { Effects } from "./systems/Effects";
import { UI } from "./ui/UI";
export class Game {
  engine!: AbstractEngine;
  scene!: Scene;
  truck!: ForkliftController;
  cargo!: Cargo;
  mission!: MissionManager;
  damage!: DamageSystem;
  camera!: FollowCamera;
  private level = resolveLevel(
    new URLSearchParams(location.search).get("level"),
  );
  private input: Input;
  private ui: UI;
  private audio = new GameAudio();
  private effects!: Effects;
  private paused = false;
  private restarting = false;
  private resultShown = false;
  private disposed = false;
  constructor(private canvas: HTMLCanvasElement) {
    this.ui = new UI(document.querySelector("#ui")!, {
      retry: () => void this.restart(),
      level: () => this.level,
      selectLevel: (id) => void this.restart(resolveLevel(id)),
      nextLevel: () =>
        void this.restart(
          levels[(levels.indexOf(this.level) + 1) % levels.length],
        ),
      pause: () => this.togglePause(),
      mute: () => this.audio.toggle(),
    });
    this.input = new Input(
      canvas,
      (force) => this.togglePause(force),
      () => void this.restart(),
      () => void this.audio.start().catch(() => {}),
    );
  }
  async start() {
    try {
      // WebGPU may be disabled by device policy; a failed adapter initialization falls back to WebGL.
      if (
        !new URLSearchParams(location.search).has("webgl") &&
        (await WebGPUEngine.IsSupportedAsync)
      ) {
        let gpu: WebGPUEngine | undefined;
        try {
          gpu = new WebGPUEngine(this.canvas, { antialias: true });
          await gpu.initAsync(
            { jsPath: glslangJs, wasmPath: glslangWasm },
            { jsPath: twgslJs, wasmPath: twgslWasm },
          );
          this.engine = gpu;
        } catch {
          gpu?.dispose();
        }
      }
      this.engine ??= new Engine(
        this.canvas,
        true,
        { preserveDrawingBuffer: false, stencil: true },
        true,
      );
      this.engine.renderEvenInBackground = false;
      this.engine.setHardwareScalingLevel(
        Math.max(1, window.devicePixelRatio / 1.5),
      );
      await this.createScene();
      window.addEventListener("resize", this.resize);
      this.engine.runRenderLoop(() => this.frame());
      this.ui.ready();
      this.canvas.focus();
    } catch (error) {
      console.error(error);
      this.ui.error("loadError");
    }
  }
  private resize = () => this.engine.resize();
  private async createScene() {
    this.scene = new Scene(this.engine);
    const plugin = await enablePhysics(this.scene);
    const f = new Factory(this.scene);
    const warehouse = new Warehouse(this.scene, f, this.level);
    this.truck = new ForkliftController(f, this.level.spawn);
    this.cargo = new Cargo(f, this.level);
    this.camera = new FollowCamera(
      this.scene,
      this.truck,
      warehouse.cameraObstacles,
    );
    this.effects = new Effects(f, this.scene);
    this.damage = new DamageSystem(
      plugin,
      this.cargo,
      warehouse.property,
      this.truck.body,
      (strength, p) => {
        this.audio.impact(strength);
        this.effects.impact(strength, p);
        this.camera.shake = Math.min(0.3, strength * 0.035);
      },
    );
    this.mission = new MissionManager(this.cargo, this.truck, this.level);
    warehouse.finishShadows();
    // Render-independent commands can later be recorded for replay/ghost inputs.
    this.scene.onBeforePhysicsObservable.add(() => {
      if (!this.paused && !this.resultShown) {
        this.truck.update(1 / 120, this.input);
        this.damage.beforeStep([
          this.truck.body,
          this.truck.forkBody,
          this.cargo.body,
        ]);
      }
    });
    this.camera.update(1 / 60, this.input);
  }
  private frame() {
    if (this.restarting || this.disposed) return;
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    const halted = this.paused || this.resultShown;
    this.scene.physicsEnabled = !halted;
    if (!halted) {
      this.damage.update(dt);
      this.mission.update(
        dt,
        ["KeyW", "KeyS", "KeyA", "KeyD", "KeyE", "KeyQ"].some((k) =>
          this.input.keys.has(k),
        ),
      );
      this.camera.update(dt, this.input);
      this.effects.update(
        dt,
        this.truck.root.position,
        Math.atan2(this.truck.forward.x, this.truck.forward.z),
        this.input.keys.has("Space") && Math.abs(this.truck.speed) > 2.5,
      );
    }
    this.audio.update(dt, this.truck.speed, this.truck.hydraulic, halted);
    this.scene.render();
    this.ui.update(
      this.stats,
      this.mission.hint,
      this.mission.stage,
      this.truck.speed,
      this.truck.lift,
      this.truck.tilt,
      {
        x: this.truck.root.position.x,
        z: this.truck.root.position.z,
        yaw: Math.atan2(this.truck.forward.x, this.truck.forward.z),
      },
      this.cargo.root.position,
    );
    if (this.mission.delivered && !this.resultShown) {
      this.resultShown = true;
      this.input.keys.clear();
      this.ui.results(this.stats);
      this.audio.success();
    }
  }
  async playtestInput(keys: string[], seconds: number) {
    if (!import.meta.env.DEV) return;
    this.input.keys.clear();
    for (const key of keys)
      if (key !== "Wait")
        this.input.keys.add(key.length === 1 ? "Key" + key : key);
    await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
    this.input.keys.clear();
  }
  get stats() {
    return {
      seconds: this.mission.seconds,
      integrity: this.damage.integrity,
      propertyDamage: this.damage.propertyDamage,
      collisions: this.damage.collisions,
      delivered: this.mission.delivered,
    };
  }
  togglePause(force = false) {
    if (force && this.paused) return;
    if (!this.scene || this.resultShown || this.restarting) return;
    this.paused = !this.paused;
    this.input.keys.clear();
    if (this.paused) this.ui.paused();
    else {
      this.ui.ready();
      this.canvas.focus();
    }
  }
  async restart(level: MissionDefinition = this.level) {
    if (!this.scene || this.restarting) return;
    this.restarting = true;
    this.level = level;
    const url = new URL(location.href);
    url.searchParams.set("level", level.id);
    history.replaceState(null, "", url);
    this.ui.resetLevel();
    this.input.keys.clear();
    this.scene.dispose();
    try {
      await this.createScene();
      this.paused = false;
      this.resultShown = false;
      this.ui.ready();
      this.canvas.focus();
    } catch (error) {
      console.error(error);
      this.ui.error("restartError");
    } finally {
      this.restarting = false;
    }
  }
  dispose() {
    this.disposed = true;
    this.input.dispose();
    this.ui.dispose();
    this.audio.dispose();
    window.removeEventListener("resize", this.resize);
    this.scene?.dispose();
    this.engine?.dispose();
  }
}
