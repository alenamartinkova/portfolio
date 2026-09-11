import type { Game } from '../Game';
import { gateState } from '../systems/SecuritySystem';
/** Dev-only visible input driver. Exercises the actual controller without teleporting or bypassing collisions. */
export class Playtest {
    private mode = 'idle';
    private scenario = 'normal';
    private target = 1;
    private launched = false;
    private jumped = false;
    private elapsed = 0;
    private initialFalls = 0;
    private log: string[] = [];
    private output: HTMLOutputElement;
    constructor(private game: Game) {
        const panel = document.createElement('div');
        panel.style.cssText = 'position:fixed;right:12px;bottom:80px;z-index:100;background:#142a29ed;color:white;padding:12px;font:11px monospace;max-width:350px;pointer-events:auto;border:1px solid #9ab491;border-radius:8px';
        panel.innerHTML = '<div>DEVELOPMENT PLAYTEST · real controller input</div><button>Traverse route</button> <button>Walk off edge</button> <button>Stop test</button> <button>Checkpoint recovery</button> <button>Shortcut route</button><output style="display:block;white-space:pre-wrap;margin-top:8px"></output>';
        document.body.append(panel);
        this.output = panel.querySelector('output')!;
        const buttons = panel.querySelectorAll('button');
        buttons[0].onclick = () => { game.restart(); this.mode = 'route'; this.scenario = 'normal'; this.target = 1; this.launched = false; this.elapsed = 0; this.initialFalls = 0; this.log = []; };
        buttons[1].onclick = () => { game.play(); this.mode = 'floor'; this.initialFalls = game.run.falls; this.elapsed = 0; };
        buttons[2].onclick = () => { this.mode = 'stopped'; game.input.clear(); };
        buttons[3].onclick = () => { buttons[0].click(); this.scenario = 'checkpoint'; };
        buttons[4].onclick = () => { buttons[0].click(); this.scenario = 'shortcut'; };
    }
    update(dt: number) {
        const g = this.game;
        this.elapsed += dt;
        if (g.state === 'playing' && this.mode === 'route') {
            if (g.run.falls > this.initialFalls) {
                this.mode = 'FAILED at stop ' + this.target;
                g.input.clear();
            }
            else {
                const s = this.scenario === 'shortcut' && this.target === 7 ? { x: -2.9, z: 25 } : g.definition.route[this.target] ?? { x: 3, z: 72.8 };
                const p = g.player.position;
                const dx = s.x - p.x, dz = s.z - p.z;
                const distance = Math.hypot(dx, dz);
                g.input.keys.clear();
                g.camera.yaw = Math.atan2(dx, dz);
                if (distance > .18) {
                    g.input.keys.add('KeyW');
                    if (distance > 2.1)
                        g.input.keys.add('ShiftLeft');
                }
                const gate = g.definition.gates.find(gate => gate.after === this.target - 1);
                const signal = gate ? gateState(gate, g.level.security.seconds) : undefined;
                if (!this.launched && g.player.grounded && signal && (signal.active || signal.safeFor < 1.4)) {
                    g.input.keys.clear();
                    this.output.textContent = JSON.stringify({ mode: 'waiting for security', target: this.target });
                    return;
                }
                if (!this.launched && g.player.grounded) {
                    g.input.pressed.add('Space');
                    g.input.keys.add('Space');
                    this.launched = true;
                    this.jumped = false;
                }
                if (this.launched)
                    g.input.keys.add('Space');
                if (!g.player.grounded)
                    this.jumped = true;
                if (distance < .62 && g.player.grounded && this.jumped) {
                    this.log.push('landed ' + this.target);
                    this.target += this.scenario === 'shortcut' && this.target === 7 ? 2 : 1;
                    this.launched = false;
                    if (this.scenario === 'checkpoint' && g.checkpoints.current === 2) {
                        this.mode = 'floor';
                        this.initialFalls = g.run.falls;
                    }
                }
            }
        }
        else if (g.state === 'playing' && this.mode === 'floor') {
            g.camera.yaw = Math.PI / 2;
            g.input.keys.add('KeyW');
            if (g.run.falls > this.initialFalls) {
                g.input.clear();
                this.mode = 'floor detected; recovering';
            }
        }
        if (g.state === 'finished' && this.mode === 'route')
            this.mode = 'COMPLETE';
        if (this.elapsed > 240 && ['route', 'floor'].includes(this.mode)) {
            this.mode = 'TIMEOUT';
            g.input.clear();
        }
        this.output.textContent = JSON.stringify({ mode: this.mode, target: this.target, p: g.player.position.asArray().map(n => +n.toFixed(2)), grounded: g.player.grounded, velocity: g.player.controller.getVelocity().asArray().map(n => +n.toFixed(2)), falls: g.run.falls, checkpoint: g.checkpoints.current, state: g.state, fps: Math.round(g.engine.getFps()), landings: this.log }, null, 1);
    }
}
