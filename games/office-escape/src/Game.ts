import { Engine } from '@babylonjs/core/Engines/engine';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PlayerController } from './player/PlayerController';
import { FollowCamera } from './player/FollowCamera';
import { Input } from './systems/Input';
import { enablePhysics, PhysicsInteractionSystem } from './systems/PhysicsInteractionSystem';
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
    checkpoints = new CheckpointManager();
    floor = new FloorDetectionSystem();
    audio = new GameAudio();
    ui: UI;
    state: 'loading' | 'intro' | 'playing' | 'paused' | 'finished' = 'loading';
    private respawnDelay = 0;
    private ready = false;
    private playtest?: Playtest;
    constructor(private canvas: HTMLCanvasElement) {
        this.engine = new Engine(canvas, true, { stencil: true });
        this.engine.renderEvenInBackground = false;
        this.engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));
        this.scene = new Scene(this.engine);
        let storage: Storage | undefined;
        try {
            storage = window.localStorage;
        }
        catch { /* private browsing */ }
        this.run = new RunManager(new URLSearchParams(location.search).has('playtest') ? undefined : storage);
        this.input = new Input(canvas, (force) => { if (this.state === 'playing')
            this.pause();
        else if (!force && this.state === 'paused')
            this.play(); });
        this.ui = new UI(document.querySelector('#ui')!, { play: () => this.play(), restart: () => this.restart(), pause: () => this.state === 'paused' ? this.play() : this.pause(), mute: () => { this.audio.start(); return this.audio.toggle(); } });
    }
    async start() {
        try {
            await enablePhysics(this.scene);
            this.physics = new PhysicsInteractionSystem(this.scene);
            this.level = new Level(this.scene, this.physics);
            this.player = new PlayerController(this.scene, this.level.f, this.checkpoints.spawn);
            this.camera = new FollowCamera(this.scene, this.player.position);
            for (const mesh of this.player.root.getChildMeshes())
                this.level.shadows.addShadowCaster(mesh);
            this.physics.onImpact = s => { if (this.state === 'playing')
                this.audio.impact(s); };
            this.player.onJump = () => this.audio.jump();
            this.player.onLand = s => { this.audio.land(s); this.camera.impulse = Math.min(.2, s * .016); };
            // Settle furniture before exposing controls. No simulation runs while paused.
            for (let i = 0; i < 35; i++) {
                this.scene.render();
            }
            if (import.meta.env.DEV && new URLSearchParams(location.search).has('playtest')) {
                const { Playtest } = await import('./ui/Playtest');
                this.playtest = new Playtest(this);
            }
            this.ready = true;
            this.state = 'intro';
            this.ui.ready();
            window.addEventListener('resize', this.resize);
            this.engine.runRenderLoop(() => this.frame());
        }
        catch (e) {
            console.error(e);
            this.ui.error();
        }
    }
    private resize = () => this.engine.resize();
    play() { if (!this.ready || this.state === 'finished')
        return; this.state = 'playing'; this.input.clear(); this.audio.start(); this.ui.playing(); this.canvas.focus(); }
    pause() { if (this.state !== 'playing')
        return; this.state = 'paused'; this.input.clear(); this.physics.grabbed = null; this.ui.pause(); }
    restart() { if (!this.ready)
        return; this.run.reset(); this.checkpoints.current = 0; this.physics.reset(); this.floor.reset(); this.respawnDelay = 0; this.player.teleport(this.checkpoints.spawn); this.camera.yaw = -.32; this.camera.snap(this.player.position); this.level.exitDoor.position.x = 3; this.state = 'intro'; this.play(); }
    private recover() { this.run.falls++; this.physics.reset(); this.respawnDelay = .32; this.input.clear(); this.floor.reset(); this.ui.toast('floorTouched', true); this.audio.fail(); }
    private frame() {
        const dt = Math.min(this.engine.getDeltaTime() / 1000, .04);
        const active = this.state === 'playing';
        this.scene.physicsEnabled = active && this.respawnDelay <= 0;
        this.playtest?.update(dt);
        if (active) {
            this.run.update(this.engine.getDeltaTime() / 1000, this.player.moving || ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].some(k => this.input.keys.has(k)));
            if (this.input.consume('KeyR'))
                this.recover();
            if (this.input.consume('KeyE'))
                this.physics.toggle(this.player.position);
            if (this.respawnDelay > 0) {
                this.respawnDelay -= dt;
                if (this.respawnDelay <= 0) {
                    this.player.teleport(this.checkpoints.spawn);
                    this.camera.snap(this.player.position);
                }
            }
            else {
                this.player.update(dt, this.input, this.camera.yaw, Boolean(this.physics.grabbed));
                this.physics.update(dt, this.player.position, this.player.forward);
                const p = this.player.position;
                const hit = this.scene.pickWithRay(new Ray(p, Vector3.Down(), 1.05), m => Boolean(m.metadata?.solid));
                const floor = Boolean(hit?.pickedMesh?.metadata?.forbidden) && this.player.feet < .13;
                if (this.floor.update(dt, floor, p.y < -3))
                    this.recover();
                else if (this.checkpoints.update(p, this.player.grounded)) {
                    this.audio.checkpoint();
                    this.ui.toast('checkpointSaved');
                }
                if (p.z > 71 && p.z < 75 && Math.abs(p.x - 3) < 2.5 && this.player.feet > 2.85 && this.player.grounded) {
                    this.run.finish();
                    this.state = 'finished';
                    this.input.clear();
                    this.ui.finish(this.run);
                    this.audio.success();
                }
            }
        }
        if (this.state === 'finished')
            this.level.exitDoor.position.x = Math.min(6, this.level.exitDoor.position.x + dt * 2);
        if (this.state !== 'paused')
            this.camera.update(dt, this.player.position, this.input, this.state === 'intro');
        const nearest = this.physics.nearest(this.player.position);
        const interaction = this.physics.grabbed ? { name: this.physics.grabbed.name, grabbed: true } : nearest ? { name: nearest.name, grabbed: false } : undefined;
        this.ui.update(this.run, this.checkpoints.current, interaction, dt);
        const rolling = this.physics.objects.reduce((sum, o) => Math.max(sum, o.aggregate.body.getLinearVelocity().length()), 0);
        this.audio.update(dt, active && this.player.grounded && this.player.moving, rolling, !active);
        this.scene.render();
    }
    dispose() { this.ui.dispose(); this.input.dispose(); this.audio.dispose(); window.removeEventListener('resize', this.resize); this.scene.dispose(); this.engine.dispose(); }
}
