import { assertConstructionActive, constructScene, prepareSceneMaterials, yieldConstruction } from '../../../shared/scene-construction.js';
import { recordRenderedFrame } from '../../../shared/fps-meter.js';
import { CampaignProgress, browserStorage, campaignStars } from '../../../shared/CampaignProgress';
import { levels, resolveLevel, type MissionDefinition } from './missions/levels';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import type { PhysicsEngine } from '@babylonjs/core/Physics/v2/physicsEngine';
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
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { renderBudget, renderScale, renderAntialiasing } from './systems/RenderQuality';
import { Viewport } from '@babylonjs/core/Maths/math.viewport';
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
  private settledFor = 0;
  private sleepingAt = 0;
  private idleTimer = 0;
  private velocity = Vector3.Zero();
  private angularVelocity = Vector3.Zero();
  private rendering = false;
  private renderFrame = () => this.frame();
  private appearanceObserver = new MutationObserver(() => {
    this.requestRender();
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
      settings: () => this.openSettings(),
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
      this.engine = new Engine(
        this.canvas,
        false,
        { preserveDrawingBuffer: false, stencil: true, powerPreference: 'low-power' },
        true,
      );
      this.engine.renderEvenInBackground = false;
      this.engine.maxFPS = renderBudget.fps;
      this.updateRenderResolution();
      await this.createScene();
      if (this.disposed) return;
      window.addEventListener('resize', this.resize);
      document.addEventListener('visibilitychange', this.visibility);
      this.appearanceObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'data-theme', 'data-accent'],
      });
      this.requestRender();
      this.updateHUD();
      this.ui.ready();
      this.input.setActive(true);
      this.input.onChange = this.requestRender;
      this.canvas.focus();
    } catch (error) {
      if (this.disposed) return;
      console.error(error);
      this.ui.error('loadError');
    }
  }
  private requestRender = () => {
    if (this.sleepingAt) {
      this.accountIdleTime();
      this.sleepingAt = 0;
      clearInterval(this.idleTimer);
    }
    this.settledFor = 0;
    this.renderDirty = true;
    if (!this.engine || !this.scene || this.disposed || this.restarting || document.hidden || this.rendering) return;
    // A paused interval must not become physics catch-up time on resume.
    this.engine.performanceMonitor.reset();
    this.rendering = true;
    this.engine.runRenderLoop(this.renderFrame);
  };
  private stopRendering() {
    this.engine?.stopRenderLoop(this.renderFrame);
    this.rendering = false;
  }
  private visibility = () => {
    if (document.hidden) this.stopRendering();
    else this.requestRender();
  };
  private updateRenderResolution() {
    const rect = this.canvas.getBoundingClientRect();
    this.engine.setHardwareScalingLevel(renderScale(rect.width, rect.height, window.devicePixelRatio));
    this.engine.resize();
  }
  private resize = () => {
    this.updateRenderResolution();
    if (this.garageOpen) this.previewTruck();
    this.requestRender();
  };
  private async createScene() {
    this.scene = new Scene(this.engine);
    const scene = this.scene;
    const cancelled = () => this.disposed || scene.isDisposed;
    this.scene.onAfterRenderObservable.add(recordRenderedFrame);
    const plugin = await enablePhysics(this.scene);
    await yieldConstruction();
    assertConstructionActive(cancelled);
    const previousMaterialBlocking = this.scene.blockMaterialDirtyMechanism;
    this.scene.blockMaterialDirtyMechanism = true;
    try {
      const f = new Factory(this.scene);
      const warehouse = await Warehouse.create(scene, f, this.level);
      await yieldConstruction();
      assertConstructionActive(cancelled);
      this.truck = await ForkliftController.create(f, this.level.spawn, this.truckStyle);
      assertConstructionActive(cancelled);
      this.truck.workLight.intensity = this.level.atmosphere === 'night' ? 1.35 : .45;
      this.truck.setWorkLight(this.lightOn);
      this.truck.model.setEnvironmentIntensity(this.level.atmosphere === 'night' ? .06 : .55);
      this.cargo = new Cargo(f, this.level);
      this.truck.setCargo(this.cargo);
      await yieldConstruction();
      assertConstructionActive(cancelled);
      this.camera = new FollowCamera(this.scene, this.truck, warehouse.cameraObstacles);
      // Scene.render advances Havok before this observer. Follow the same pose that
      // is drawn, instead of aiming at the preceding physics frame while driving.
      this.scene.onBeforeRenderObservable.add(() => {
        if (!this.paused && !this.resultShown)
          this.camera.update(Math.min(.05, this.engine.getDeltaTime() / 1000), this.input, document.body.hasAttribute('data-touch-game'));
      });
      const antialias = new DefaultRenderingPipeline('warehouse antialiasing', false, this.scene, [this.camera.camera]);
      antialias.imageProcessingEnabled = false;
      // Multisampling smooths geometry; FXAA also covers devices without MSAA support.
      const quality = renderAntialiasing(this.engine.getCaps().maxMSAASamples);
      antialias.samples = quality.samples;
      antialias.fxaaEnabled = quality.fxaa;
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
      if (renderBudget.shadows && this.level.atmosphere === 'night') {
        const lampShadow = new ShadowGenerator(renderBudget.lampShadowSize, this.truck.workLight);
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
      const damageBodies = [this.truck.body, this.truck.forkBody, this.cargo.body];
      this.scene.onBeforePhysicsObservable.add(() => {
        if (!this.paused && !this.resultShown) {
          this.truck.update(1 / 120, this.input);
          this.damage.beforeStep(damageBodies);
        }
      });
      this.camera.update(1 / 60, this.input, document.body.hasAttribute('data-touch-game'));
    } catch (error) {
      scene.dispose();
      throw error;
    } finally {
      // Babylon marks all materials dirty once when this is restored to false.
      if (!scene.isDisposed) scene.blockMaterialDirtyMechanism = previousMaterialBlocking;
    }
    try {
      await constructScene(prepareSceneMaterials(scene), { isCancelled: cancelled });
      scene.executeWhenReady(this.requestRender);
    } catch (error) { scene.dispose(); throw error; }
  }
  private frame() {
    if (this.restarting || this.disposed) return;
    const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
    const halted = this.paused || this.resultShown;
    this.scene.physicsEnabled = !halted;
    if (halted) {
      this.audio.update(0, this.truck.speed, this.truck.hydraulic, true);
      if (this.renderDirty) this.scene.render();
      this.renderDirty = false;
      this.stopRendering();
      return;
    }
    this.damage.update(dt);
    this.mission.update(
      dt,
      ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE', 'KeyQ'].some((k) => this.input.keys.has(k)),
    );
    this.effects.update(
      dt,
      this.truck.root.position,
      Math.atan2(this.truck.forward.x, this.truck.forward.z),
      this.input.keys.has('Space') && Math.abs(this.truck.speed) > 2.5,
    );
    this.audio.update(dt, this.truck.speed, this.truck.hydraulic, halted);
    this.scene.render();
    this.renderDirty = false;
    this.updateHUD();
    if (this.mission.delivered && !this.resultShown) {
      this.resultShown = true;
      this.input.setActive(false);
      this.progress.complete(this.level.id, this.mission.seconds, this.stats.stars);
      this.ui.results(this.stats);
      this.audio.success();
    }
    this.settledFor = this.isSettled() ? this.settledFor + dt : 0;
    if (this.settledFor > 2 && !this.resultShown) {
      this.scene.physicsEnabled = false;
      this.audio.update(0, 0, 0, true);
      this.audio.suspend();
      this.sleepingAt = performance.now();
      this.stopRendering();
      this.idleTimer = window.setInterval(() => { this.accountIdleTime(); if (this.mission.started) this.updateHUD(); }, 1000);
    }
  }
  private updateHUD() {
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
  }
  private accountIdleTime() {
    const now = performance.now();
    if (this.mission.started && !this.paused && !document.hidden) this.mission.seconds += (now - this.sleepingAt) / 1000;
    this.sleepingAt = now;
  }
  private isSettled() {
    if (this.input.keys.size || this.input.dragging || this.mission.hold > 0 || this.mission.inspections.hold > 0) return false;
    const bodies = (this.scene.getPhysicsEngine() as PhysicsEngine).getBodies();
    for (const body of bodies) {
      if (body.getMotionType() === 0) continue;
      body.getLinearVelocityToRef(this.velocity); body.getAngularVelocityToRef(this.angularVelocity);
      if (this.velocity.lengthSquared() > .0004 || this.angularVelocity.lengthSquared() > .0004) return false;
    }
    return true;
  }
  async playtestInput(keys: string[], seconds: number) {
    if (!import.meta.env.DEV) return;
    this.requestRender();
    this.input.clear();
    for (const key of keys)
      if (key !== 'Wait') this.input.keys.add(key.length === 1 ? 'Key' + key : key);
    await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
    this.input.clear();
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
    if (this.sleepingAt) this.accountIdleTime();
    this.paused = !this.paused;
    if (this.garageOpen) {
      this.garageOpen = false;
      this.camera.camera.viewport = new Viewport(0, 0, 1, 1);
      this.garageLight.setEnabled(false);
      this.truck.model.setEnvironmentIntensity(this.level.atmosphere === 'night' ? .06 : .55);
      this.truck.setWorkLight(this.lightOn);
      this.requestRender();
    }
    this.audio.update(0, this.truck.speed, this.truck.hydraulic, this.paused);
    this.requestRender();
    if (this.paused) {
      this.input.setActive(false);
      this.ui.paused();
    } else {
      this.updateHUD();
      this.ui.ready();
      this.input.setActive(true);
      this.input.onChange = this.requestRender;
      this.canvas.focus();
    }
  }
  private toggleLight() {
    this.lightOn = !this.lightOn;
    this.truck?.setWorkLight(this.lightOn);
    this.ui.refreshLight();
    this.requestRender();
    this.scene?.executeWhenReady(this.requestRender);
  }
  private openSettings() {
    if (!this.scene || this.restarting || this.resultShown) return;
    if (this.sleepingAt) this.accountIdleTime();
    this.paused = true;
    this.input.setActive(false);
    if (this.garageOpen) {
      this.garageOpen = false;
      this.camera.camera.viewport = new Viewport(0, 0, 1, 1);
      this.garageLight.setEnabled(false);
      this.truck.model.setEnvironmentIntensity(this.level.atmosphere === 'night' ? .06 : .55);
      this.truck.setWorkLight(this.lightOn);
    }
    this.ui.settingsMenu();
    this.requestRender();
  }
  private openGarage() {
    if (!this.scene || this.restarting || this.resultShown) return;
    if (this.sleepingAt) this.accountIdleTime();
    this.paused = true;
    this.garageOpen = true;
    this.input.setActive(false);
    this.garageLight.setEnabled(true);
    this.truck.model.setEnvironmentIntensity(.7);
    this.truck.workLight.setEnabled(false);
    this.previewAngle = -.8;
    this.previewTruck();
    this.scene.executeWhenReady(this.requestRender);
    this.ui.garage();
  }
  private previewTruck() {
    const root = this.truck.root.position;
    const portrait = document.body.hasAttribute('data-touch-game') && window.innerWidth <= 600;
    this.camera.camera.viewport = portrait ? new Viewport(0, .36, 1, .64) : new Viewport(0, 0, 1, 1);
    const distance = portrait ? 8.5 : 7.3;
    const offset = portrait ? 0 : 1.5;
    const yaw = Math.atan2(this.truck.forward.x, this.truck.forward.z) + this.previewAngle;
    this.camera.camera.position.set(
      Math.max(-17, Math.min(17, root.x - Math.sin(yaw) * distance)),
      root.y + 3.15,
      Math.max(-20, Math.min(20, root.z - Math.cos(yaw) * distance)),
    );
    // Leave visual space for the garage controls on the right.
    this.camera.camera.setTarget(root.add(new Vector3(Math.cos(yaw) * offset, 1, -Math.sin(yaw) * offset)));
    this.requestRender();
  }
  private customize(style: TruckStyle) {
    this.truckStyle = style;
    saveStyle(style);
    this.truck.applyStyle(style);
    this.requestRender();
    this.scene.executeWhenReady(this.requestRender);
  }
  async restart(level: MissionDefinition = this.level) {
    if (!this.scene || this.restarting) return;
    this.restarting = true;
    this.stopRendering();
    clearInterval(this.idleTimer); this.sleepingAt = 0; this.settledFor = 0;
    this.level = level;
    this.garageOpen = false;
    const url = new URL(location.href);
    url.searchParams.set('level', level.id);
    history.replaceState(null, '', url);
    this.ui.resetLevel();
    this.input.setActive(false);
    this.scene.dispose();
    try {
      await this.createScene();
      if (this.disposed) return;
      this.paused = false;
      this.resultShown = false;
      this.updateHUD();
      this.ui.ready();
      this.input.setActive(true);
      this.input.onChange = this.requestRender;
      this.canvas.focus();
      this.restarting = false;
      this.requestRender();
    } catch (error) {
      if (this.disposed) return;
      console.error(error);
      this.ui.error('restartError');
    } finally {
      this.restarting = false;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearInterval(this.idleTimer);
    this.stopRendering();
    this.appearanceObserver.disconnect();
    this.input.dispose();
    this.ui.dispose();
    this.audio.dispose();
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.visibility);
    this.scene?.dispose();
    this.engine?.dispose();
  }
}
