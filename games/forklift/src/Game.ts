import { CampaignProgress, browserStorage, campaignStars } from '../../../shared/CampaignProgress';
import { levels, resolveLevel, type MissionDefinition } from './missions/levels';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { enablePhysics } from './systems/Physics';
import { Factory } from './world/Factory';
import { Warehouse } from './world/Warehouse';
import { Cargo } from './world/Cargo';
import { ForkliftController } from './player/ForkliftController';
import { FollowCamera } from './player/FollowCamera';
import { Input } from './systems/Input';
import { DamageSystem } from './systems/DamageSystem';
import { MissionManager } from './systems/MissionManager';
import { GameAudio } from './systems/Audio';
import { Effects } from './systems/Effects';
import { UI } from './ui/UI';
import { readStyle, saveStyle, type TruckStyle } from './player/Customization';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
export class Game {
  engine!: AbstractEngine;
  scene!: Scene;
  truck!: ForkliftController;
  cargo!: Cargo;
  mission!: MissionManager;
  damage!: DamageSystem;
  camera!: FollowCamera;
  private level = resolveLevel(new URLSearchParams(location.search).get('level'));
  private progress = new CampaignProgress(
    'forklift',
    new URLSearchParams(location.search).has('qa') ? undefined : browserStorage(),
  );
  private input: Input;
  private ui: UI;
  private audio = new GameAudio();
  private effects!: Effects;
  private paused = false;
  private restarting = false;
  private resultShown = false;
  private truckStyle = readStyle();
  private lightOn = true;
  private garageOpen = false;
  private garageLight!: HemisphericLight;
  private previewAngle = -.8;
  private disposed = false;
  private renderDirty = true;
  private appearanceObserver = new MutationObserver(() => {
    this.renderDirty = true;
  });
  constructor(private canvas: HTMLCanvasElement) {
    this.ui = new UI(document.querySelector('#ui')!, {
      record: (id) => this.progress.get(id),
      retry: () => void this.restart(),
      level: () => this.level,
      selectLevel: (id) => void this.restart(resolveLevel(id)),
      nextLevel: () => void this.restart(levels[(levels.indexOf(this.level) + 1) % levels.length]),
      pause: () => this.togglePause(),
      mute: () => this.audio.toggle(),
      garage: () => this.openGarage(),
      style: () => this.truckStyle,
      customize: (style) => this.customize(style),
      rotatePreview: (direction) => { this.previewAngle += direction * .5; this.previewTruck(); },
      light: () => this.lightOn,
      toggleLight: () => this.toggleLight(),
    });
    this.input = new Input(
      canvas,
      (force) => this.togglePause(force),
      () => void this.restart(),
      () => void this.audio.start().catch(() => {}),
      () => this.toggleLight(),
    );
  }
  async start() {
    try {
      // WebGPU may be disabled by device policy; a failed adapter initialization falls back to WebGL.
      if (!new URLSearchParams(location.search).has('webgl') && 'gpu' in navigator) {
        try {
          const { createWebGPUEngine } = await import('./systems/WebGPU');
          const gpu = await createWebGPUEngine(this.canvas);
          if (gpu) this.engine = gpu;
        } catch {
          /* Loading an optional backend must not prevent WebGL fallback. */
        }
      }
      this.engine ??= new Engine(
        this.canvas,
        true,
        { preserveDrawingBuffer: false, stencil: true },
        true,
      );
      this.engine.renderEvenInBackground = false;
      this.engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
      await this.createScene();
      window.addEventListener('resize', this.resize);
      this.appearanceObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'data-theme', 'data-accent'],
      });
      this.engine.runRenderLoop(() => this.frame());
      this.ui.ready();
      this.canvas.focus();
    } catch (error) {
      console.error(error);
      this.ui.error('loadError');
    }
  }
  private resize = () => {
    this.engine.resize();
    this.renderDirty = true;
  };
  private async createScene() {
    this.scene = new Scene(this.engine);
    const plugin = await enablePhysics(this.scene);
    const f = new Factory(this.scene);
    const warehouse = new Warehouse(this.scene, f, this.level);
    this.truck = new ForkliftController(f, this.level.spawn, this.truckStyle);
    this.truck.workLight.intensity = this.level.atmosphere === 'night' ? 1.35 : .45;
    this.truck.setWorkLight(this.lightOn);
    this.cargo = new Cargo(f, this.level);
    this.camera = new FollowCamera(this.scene, this.truck, warehouse.cameraObstacles);
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
    if (this.level.atmosphere === 'night') {
      const lampShadow = new ShadowGenerator(1024, this.truck.workLight);
      lampShadow.usePercentageCloserFiltering = true;
      lampShadow.bias = .002;
      lampShadow.normalBias = .04;
      this.truck.workLight.shadowMinZ = .3;
      this.truck.workLight.shadowMaxZ = 40;
      lampShadow.filteringQuality = ShadowGenerator.QUALITY_LOW;
      for (const mesh of this.scene.meshes)
        if (mesh.getTotalVertices() > 6 && mesh.getBoundingInfo().boundingBox.extendSize.y > .04 && mesh.name !== 'concrete floor' && !mesh.isDescendantOf(this.truck.root))
          lampShadow.addShadowCaster(mesh);
    }
    this.garageLight = new HemisphericLight('garage fill', new Vector3(-1, 1, -1), this.scene);
    this.garageLight.intensity = this.level.atmosphere === 'night' ? 1.2 : .3;
    this.garageLight.includedOnlyMeshes = [...this.truck.root.getChildMeshes(), ...this.truck.forkRoot.getChildMeshes()];
    this.garageLight.setEnabled(false);
    // Render-independent commands can later be recorded for replay/ghost inputs.
    this.scene.onBeforePhysicsObservable.add(() => {
      if (!this.paused && !this.resultShown) {
        this.truck.update(1 / 120, this.input);
        this.damage.beforeStep([this.truck.body, this.truck.forkBody, this.cargo.body]);
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
        ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyQ'].some((k) => this.input.keys.has(k)),
      );
      this.camera.update(dt, this.input);
      this.effects.update(
        dt,
        this.truck.root.position,
        Math.atan2(this.truck.forward.x, this.truck.forward.z),
        this.input.keys.has('Space') && Math.abs(this.truck.speed) > 2.5,
      );
    }
    this.audio.update(dt, this.truck.speed, this.truck.hydraulic, halted);
    // The paused/result scene is static; leave its last frame on the canvas.
    if (!halted || this.renderDirty) {
      this.scene.render();
      this.renderDirty = false;
    }
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
      this.mission.inspections.current,
      this.mission.inspections.hold,
    );
    if (this.mission.delivered && !this.resultShown) {
      this.resultShown = true;
      this.input.keys.clear();
      this.progress.complete(this.level.id, this.mission.seconds, this.stats.stars);
      this.ui.results(this.stats);
      this.audio.success();
    }
  }
  async playtestInput(keys: string[], seconds: number) {
    if (!import.meta.env.DEV) return;
    this.input.keys.clear();
    for (const key of keys)
      if (key !== 'Wait') this.input.keys.add(key.length === 1 ? 'Key' + key : key);
    await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
    this.input.keys.clear();
  }
  get stats() {
    return {
      stars: this.mission.delivered
        ? campaignStars(
            this.mission.seconds,
            this.level.par,
            this.damage.integrity >= 90 && this.damage.propertyDamage === 0,
          )
        : 0,
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
    if (this.garageOpen) {
      this.garageOpen = false;
      this.garageLight.setEnabled(false);
      this.truck.setWorkLight(this.lightOn);
      this.renderDirty = true;
    }
    this.input.keys.clear();
    if (this.paused) this.ui.paused();
    else {
      this.ui.ready();
      this.canvas.focus();
    }
  }
  private toggleLight() {
    this.lightOn = !this.lightOn;
    this.truck?.setWorkLight(this.lightOn);
    this.ui.refreshLight();
    this.renderDirty = true;
    this.scene?.executeWhenReady(() => { this.renderDirty = true; });
  }
  private openGarage() {
    if (!this.scene || this.restarting || this.resultShown) return;
    this.paused = true;
    this.garageOpen = true;
    this.input.keys.clear();
    this.garageLight.setEnabled(true);
    this.truck.workLight.setEnabled(false);
    this.previewAngle = -.8;
    this.previewTruck();
    this.scene.executeWhenReady(() => { this.renderDirty = true; });
    this.ui.garage();
  }
  private previewTruck() {
    const root = this.truck.root.position;
    const yaw = Math.atan2(this.truck.forward.x, this.truck.forward.z) + this.previewAngle;
    this.camera.camera.position.set(
      Math.max(-17, Math.min(17, root.x - Math.sin(yaw) * 8.5)),
      root.y + 4.2,
      Math.max(-20, Math.min(20, root.z - Math.cos(yaw) * 8.5)),
    );
    // Leave visual space for the garage controls on the right.
    this.camera.camera.setTarget(root.add(new Vector3(Math.cos(yaw) * 1.5, 1, -Math.sin(yaw) * 1.5)));
    this.renderDirty = true;
  }
  private customize(style: TruckStyle) {
    this.truckStyle = style;
    saveStyle(style);
    this.truck.applyStyle(style);
    this.renderDirty = true;
    this.scene.executeWhenReady(() => { this.renderDirty = true; });
  }
  async restart(level: MissionDefinition = this.level) {
    if (!this.scene || this.restarting) return;
    this.restarting = true;
    this.level = level;
    this.garageOpen = false;
    const url = new URL(location.href);
    url.searchParams.set('level', level.id);
    history.replaceState(null, '', url);
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
      this.ui.error('restartError');
    } finally {
      this.restarting = false;
    }
  }
  dispose() {
    this.disposed = true;
    this.appearanceObserver.disconnect();
    this.input.dispose();
    this.ui.dispose();
    this.audio.dispose();
    window.removeEventListener('resize', this.resize);
    this.scene?.dispose();
    this.engine?.dispose();
  }
}
