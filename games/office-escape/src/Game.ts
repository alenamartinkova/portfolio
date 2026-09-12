import { yieldToMain } from '../../../shared/load-game.js';
import { recordRenderedFrame } from '../../../shared/fps-meter.js';
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import { renderBudget, renderScale, renderAntialiasing } from './systems/RenderQuality';
import { CampaignProgress, browserStorage, campaignStars } from '../../../shared/CampaignProgress';
import { atExit, officeLevels, resolveOfficeLevel } from './world/levels';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PlayerController } from './player/PlayerController';
import { FollowCamera } from './player/FollowCamera';
import { Input } from './systems/Input';
import {
  enablePhysics,
  PhysicsInteractionSystem,
  settlePhysics,
} from './systems/PhysicsInteractionSystem';
import { FloorDetectionSystem } from './systems/FloorDetectionSystem';
import { CheckpointManager } from './systems/CheckpointManager';
import { RunManager } from './systems/RunManager';
import { GameAudio } from './systems/Audio';
import { Level } from './world/Level';
import { UI } from './ui/UI';
import type { Playtest } from './ui/Playtest';
export class Game {
  engine: Engine;
  scene: Scene;
  player!: PlayerController;
  level!: Level;
  physics!: PhysicsInteractionSystem;
  camera!: FollowCamera;
  input: Input;
  run: RunManager;
  definition = resolveOfficeLevel(new URLSearchParams(location.search).get('level'));
  checkpoints = new CheckpointManager(this.definition.route);
  private storage = new URLSearchParams(location.search).has('playtest')
    ? undefined
    : browserStorage();
  progress = new CampaignProgress('office-escape:routes-v2', this.storage);
  floor = new FloorDetectionSystem();
  audio = new GameAudio();
  ui: UI;
  state: 'loading' | 'intro' | 'playing' | 'paused' | 'settings' | 'finished' = 'loading';
  private settingsReturn: 'intro' | 'playing' = 'intro';
  private respawnDelay = 0;
  private ready = false;
  private renderDirty = true;
  private rendering = false;
  private disposed = false;
  private idleTime = 0;
  private renderFrame = () => this.frame();
  private previousPosition = Vector3.Zero();
  private rollingVelocity = Vector3.Zero();
  private floorRay = new Ray(Vector3.Zero(), Vector3.Down(), 1.05);
  private appearanceObserver = new MutationObserver(() => {
    this.requestRender();
  });
  private playtest?: Playtest;
  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, false, { stencil: true, powerPreference: 'low-power' });
    this.engine.renderEvenInBackground = false;
    this.engine.maxFPS = renderBudget.fps;
    this.engine.setHardwareScalingLevel(renderScale(canvas.clientWidth, canvas.clientHeight, devicePixelRatio));
    this.scene = new Scene(this.engine);
    this.run = new RunManager(this.storage, this.definition.id);
    this.input = new Input(canvas, (force) => {
      if (this.state === 'playing') this.pause();
      else if (!force && this.state === 'paused') this.play();
      else if (!force && this.state === 'settings') this.closeSettings();
    });
    this.ui = new UI(document.querySelector('#ui')!, {
      level: () => this.definition,
      record: (id) => this.progress.get(id),
      cards: () => this.level?.security.collected.size ?? 0,
      selectLevel: (id) => void this.selectLevel(id),
      nextLevel: () =>
        void this.selectLevel(
          officeLevels[(officeLevels.indexOf(this.definition) + 1) % officeLevels.length].id,
        ),
      play: () => this.play(),
      restart: () => this.restart(),
      pause: () => this.state === 'settings' ? this.closeSettings() : this.state === 'paused' ? this.play() : this.pause(),
      settings: () => this.openSettings(),
      closeSettings: () => this.closeSettings(),
      mute: () => {
        this.audio.start();
        return this.audio.toggle();
      },
    });
  }
  async start() {
    try {
      await this.createScene();
      if (import.meta.env.DEV && new URLSearchParams(location.search).has('playtest')) {
        const { Playtest } = await import('./ui/Playtest');
        this.playtest = new Playtest(this);
      }
      this.ready = true;
      this.state = 'intro';
      this.ui.ready();
      this.requestRender();
      window.addEventListener('resize', this.resize);
      document.addEventListener('visibilitychange', this.visibility);
      this.appearanceObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'data-theme', 'data-accent'],
      });
      this.requestRender();
    } catch (e) {
      console.error(e);
      this.ui.error();
    }
  }
  private requestRender = () => {
    this.renderDirty = true;
    if (!this.ready || this.disposed || document.hidden || this.rendering) return;
    this.engine.performanceMonitor.reset();
    this.rendering = true;
    this.engine.runRenderLoop(this.renderFrame);
  };
  private stopRendering() {
    this.engine.stopRenderLoop(this.renderFrame);
    this.rendering = false;
  }
  private visibility = () => {
    if (document.hidden) this.stopRendering();
    else this.requestRender();
  };
  private get startingYaw() {
    const [start, next] = this.definition.route;
    return Math.atan2(next.x - start.x, next.z - start.z) - .2;
  }
  private async createScene() {
    this.scene.onAfterRenderObservable.add(recordRenderedFrame);
    await enablePhysics(this.scene);
    await yieldToMain();
    const previousMaterialBlocking = this.scene.blockMaterialDirtyMechanism;
    this.scene.blockMaterialDirtyMechanism = true;
    try {
      this.physics = new PhysicsInteractionSystem(this.scene);
      this.level = new Level(this.scene, this.physics, this.definition);
      this.player = new PlayerController(this.scene, this.level.f, this.checkpoints.spawn);
      this.camera = new FollowCamera(this.scene, this.player.position, this.startingYaw);
      if (this.definition.architecture !== 'office') {
        const route = this.definition.route;
        const low = new Vector3(Math.min(...route.map(s => s.x)), Math.min(...route.map(s => s.y)), Math.min(...route.map(s => s.z)));
        const high = new Vector3(Math.max(...route.map(s => s.x)), Math.max(...route.map(s => s.y)), Math.max(...route.map(s => s.z)));
        this.camera.overviewTarget = low.add(high).scale(.5);
        this.camera.overviewDistance = Math.max(18, Vector3.Distance(low, high) * 1.15);
      }
      const pipeline = new DefaultRenderingPipeline('office antialiasing', false, this.scene, [this.camera.camera]);
      pipeline.imageProcessingEnabled = false;
      const quality = renderAntialiasing(this.engine.getCaps().maxMSAASamples);
      pipeline.samples = quality.samples;
      pipeline.fxaaEnabled = quality.fxaa;
      for (const mesh of this.player.root.getChildMeshes()) this.level.shadows?.addShadowCaster(mesh);
      this.physics.onImpact = (s) => {
        if (this.state === 'playing') this.audio.impact(s);
      };
      this.player.onJump = () => this.audio.jump();
      this.player.onLand = (s) => {
        this.audio.land(s);
        this.camera.impulse = Math.min(0.2, s * 0.016);
      };
      // Settle furniture before exposing controls. No simulation runs while paused.
      for (let i = 0; i < 7; i++) { settlePhysics(this.scene, 5); await yieldToMain(); }
      this.idleTime = 0;
    } finally {
      // Babylon marks all materials dirty once when this is restored to false.
      this.scene.blockMaterialDirtyMechanism = previousMaterialBlocking;
    }
    this.scene.executeWhenReady(this.requestRender);
  }
  async selectLevel(id: string) {
    if (!this.ready) return;
    this.ready = false;
    this.stopRendering();
    this.state = 'loading';
    this.input.setActive(false);
    this.definition = resolveOfficeLevel(id);
    this.run = new RunManager(this.storage, this.definition.id);
    this.checkpoints = new CheckpointManager(this.definition.route);
    this.floor.reset();
    this.respawnDelay = 0;
    const url = new URL(location.href);
    url.searchParams.set('level', this.definition.id);
    history.replaceState(null, '', url);
    this.ui.resetLevel();
    this.scene.dispose();
    this.scene = new Scene(this.engine);
    try {
      await this.createScene();
      this.ready = true;
      this.state = 'intro';
      this.ui.ready();
      this.requestRender();
    } catch (error) {
      console.error(error);
      this.ui.error();
    }
  }
  private resize = () => {
    this.engine.setHardwareScalingLevel(renderScale(this.canvas.clientWidth, this.canvas.clientHeight, devicePixelRatio));
    this.engine.resize();
    this.requestRender();
  };
  play() {
    if (!this.ready || this.state === 'finished') return;
    this.state = 'playing';
    this.idleTime = 0;
    this.requestRender();
    this.input.setActive(true);
    this.audio.start();
    this.ui.playing();
    this.canvas.focus();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.setActive(false);
    this.physics.grabbed = null;
    this.ui.pause();
    this.audio.update(0, false, 0, true);
    this.requestRender();
  }
  private openSettings() {
    if (!this.ready || this.state === 'finished' || this.state === 'settings') return;
    this.settingsReturn = this.state === 'intro' ? 'intro' : 'playing';
    this.state = 'settings';
    this.input.setActive(false);
    this.physics.grabbed = null;
    this.ui.settings();
    this.requestRender();
  }
  private closeSettings() {
    if (this.state !== 'settings') return;
    if (this.settingsReturn === 'playing') this.play();
    else { this.state = 'intro'; this.ui.ready(); this.canvas.focus(); }
    this.requestRender();
  }
  restart() {
    if (!this.ready) return;
    this.run.reset();
    this.checkpoints.current = 0;
    this.physics.reset();
    this.floor.reset();
    this.respawnDelay = 0;
    this.player.teleport(this.checkpoints.spawn);
    this.camera.yaw = this.startingYaw;
    this.camera.snap(this.player.position);
    this.level.exitDoor.position.x = this.definition.exit.x;
    this.level.security.reset();
    this.state = 'intro';
    this.play();
  }
  private recover(reason: 'floorTouched' | 'securityHit' = 'floorTouched') {
    this.run.falls++;
    this.physics.reset();
    this.respawnDelay = 0.32;
    this.input.clear();
    this.floor.reset();
    this.ui.toast(reason, true);
    this.audio.fail();
  }
  private frame() {
    if (!this.ready) return;
    const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.04);
    const active = this.state === 'playing';
    this.scene.physicsEnabled = active && this.respawnDelay <= 0;
    if (this.state === 'paused' || this.state === 'settings') {
      this.audio.update(0, false, 0, true);
      if (this.renderDirty) this.scene.render();
      this.renderDirty = false;
      this.stopRendering();
      return;
    }
    this.idleTime = active ? 0 : this.idleTime + dt;
    this.playtest?.update(dt);
    if (active) {
      this.run.update(
        this.engine.getDeltaTime() / 1000,
        this.player.moving ||
          [
            'KeyW',
            'KeyA',
            'KeyS',
            'KeyD',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Space',
          ].some((k) => this.input.keys.has(k)),
      );
      if (this.input.consume('KeyR')) this.recover();
      if (this.input.consume('KeyE')) this.physics.toggle(this.player.position);
      if (this.respawnDelay > 0) {
        this.respawnDelay -= dt;
        if (this.respawnDelay <= 0) {
          this.player.teleport(this.checkpoints.spawn);
          this.camera.snap(this.player.position);
        }
      } else {
        const previous = this.previousPosition.copyFrom(this.player.position);
        this.player.update(dt, this.input, this.camera.yaw, Boolean(this.physics.grabbed));
        this.physics.update(dt, this.player.position, this.player.forward);
        const p = this.player.position;
        const securityEvent = this.level.security.update(dt, previous, p, this.player.grounded);
        if (securityEvent === 'cardCollected') {
          this.ui.toast('cardCollected');
          this.audio.checkpoint();
        }
        this.floorRay.origin.copyFrom(p);
        const hit = this.scene.pickWithRay(this.floorRay, (m) =>
          Boolean(m.metadata?.solid),
        );
        const floor = Boolean(hit?.pickedMesh?.metadata?.forbidden) && Boolean(hit?.pickedPoint && Math.abs(this.player.feet - hit.pickedPoint.y) < .13);
        if (securityEvent === 'securityHit') this.recover('securityHit');
        else if (this.floor.update(dt, floor, p.y < -3)) this.recover();
        else if (
          this.checkpoints.update(p, this.player.grounded, (checkpoint) =>
            this.level.security.canSaveCheckpoint(checkpoint),
          )
        ) {
          this.audio.checkpoint();
          this.ui.toast('checkpointSaved');
        }
        if (
          this.respawnDelay <= 0 &&
          atExit(this.definition, p, this.player.grounded)
        ) {
          if (!this.level.security.complete) {
            this.ui.toast('exitLocked');
          } else {
            this.run.finish();
            this.progress.complete(
              this.definition.id,
              this.run.seconds,
              campaignStars(this.run.seconds, this.definition.par, this.run.falls === 0),
            );
            this.state = 'finished';
            this.input.setActive(false);
            this.ui.finish(this.run);
            this.audio.success();
          }
        }
      }
    }
    if (this.state === 'finished')
      this.level.exitDoor.position.x = Math.min(this.definition.exit.x + 3, this.level.exitDoor.position.x + dt * 2);
    this.camera.update(dt, this.player.position, this.input, this.state === 'intro');
    const nearest = this.physics.nearest(this.player.position);
    const interaction = this.physics.grabbed
      ? { name: this.physics.grabbed.name, grabbed: true }
      : nearest
        ? { name: nearest.name, grabbed: false }
        : undefined;
    this.ui.update(this.run, this.checkpoints.current, interaction, dt);
    const rolling = this.physics.objects.reduce(
      (sum, o) => { o.aggregate.body.getLinearVelocityToRef(this.rollingVelocity); return Math.max(sum, this.rollingVelocity.length()); },
      0,
    );
    this.audio.update(dt, active && this.player.grounded && this.player.moving, rolling, !active);
    this.scene.render();
    this.renderDirty = false;
    // Allow the intro camera / exit door to settle, then retain their last frame.
    if (!active && this.idleTime >= 2) this.stopRendering();
  }
  dispose() {
    this.disposed = true;
    this.stopRendering();
    this.appearanceObserver.disconnect();
    this.ui.dispose();
    this.input.dispose();
    this.audio.dispose();
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.visibility);
    this.scene.dispose();
    this.engine.dispose();
  }
}
