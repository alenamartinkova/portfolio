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
  state: 'loading' | 'intro' | 'playing' | 'paused' | 'finished' = 'loading';
  private respawnDelay = 0;
  private ready = false;
  private renderDirty = true;
  private appearanceObserver = new MutationObserver(() => {
    this.renderDirty = true;
  });
  private playtest?: Playtest;
  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { stencil: true });
    this.engine.renderEvenInBackground = false;
    this.engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine);
    this.run = new RunManager(this.storage, this.definition.id);
    this.input = new Input(canvas, (force) => {
      if (this.state === 'playing') this.pause();
      else if (!force && this.state === 'paused') this.play();
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
      pause: () => (this.state === 'paused' ? this.play() : this.pause()),
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
      window.addEventListener('resize', this.resize);
      this.appearanceObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['lang', 'data-theme', 'data-accent'],
      });
      this.engine.runRenderLoop(() => this.frame());
    } catch (e) {
      console.error(e);
      this.ui.error();
    }
  }
  private get startingYaw() {
    const [start, next] = this.definition.route;
    return Math.atan2(next.x - start.x, next.z - start.z) - .2;
  }
  private async createScene() {
    await enablePhysics(this.scene);
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
    for (const mesh of this.player.root.getChildMeshes()) this.level.shadows.addShadowCaster(mesh);
    this.physics.onImpact = (s) => {
      if (this.state === 'playing') this.audio.impact(s);
    };
    this.player.onJump = () => this.audio.jump();
    this.player.onLand = (s) => {
      this.audio.land(s);
      this.camera.impulse = Math.min(0.2, s * 0.016);
    };
    // Settle furniture before exposing controls. No simulation runs while paused.
    settlePhysics(this.scene);
  }
  async selectLevel(id: string) {
    if (!this.ready) return;
    this.ready = false;
    this.state = 'loading';
    this.input.clear();
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
    } catch (error) {
      console.error(error);
      this.ui.error();
    }
  }
  private resize = () => {
    this.engine.resize();
    this.renderDirty = true;
  };
  play() {
    if (!this.ready || this.state === 'finished') return;
    this.state = 'playing';
    this.input.clear();
    this.audio.start();
    this.ui.playing();
    this.canvas.focus();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.clear();
    this.physics.grabbed = null;
    this.ui.pause();
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
        const previous = this.player.position.clone();
        this.player.update(dt, this.input, this.camera.yaw, Boolean(this.physics.grabbed));
        this.physics.update(dt, this.player.position, this.player.forward);
        const p = this.player.position;
        const securityEvent = this.level.security.update(dt, previous, p, this.player.grounded);
        if (securityEvent === 'cardCollected') {
          this.ui.toast('cardCollected');
          this.audio.checkpoint();
        }
        const hit = this.scene.pickWithRay(new Ray(p, Vector3.Down(), 1.05), (m) =>
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
            this.input.clear();
            this.ui.finish(this.run);
            this.audio.success();
          }
        }
      }
    }
    if (this.state === 'finished')
      this.level.exitDoor.position.x = Math.min(this.definition.exit.x + 3, this.level.exitDoor.position.x + dt * 2);
    if (this.state !== 'paused')
      this.camera.update(dt, this.player.position, this.input, this.state === 'intro');
    const nearest = this.physics.nearest(this.player.position);
    const interaction = this.physics.grabbed
      ? { name: this.physics.grabbed.name, grabbed: true }
      : nearest
        ? { name: nearest.name, grabbed: false }
        : undefined;
    this.ui.update(this.run, this.checkpoints.current, interaction, dt);
    const rolling = this.physics.objects.reduce(
      (sum, o) => Math.max(sum, o.aggregate.body.getLinearVelocity().length()),
      0,
    );
    this.audio.update(dt, active && this.player.grounded && this.player.moving, rolling, !active);
    if (this.state !== 'paused' || this.renderDirty) {
      this.scene.render();
      this.renderDirty = false;
    }
  }
  dispose() {
    this.appearanceObserver.disconnect();
    this.ui.dispose();
    this.input.dispose();
    this.audio.dispose();
    window.removeEventListener('resize', this.resize);
    this.scene.dispose();
    this.engine.dispose();
  }
}
