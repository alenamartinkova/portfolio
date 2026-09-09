export class GameAudio {
    private context?: AudioContext;
    private master?: GainNode;
    muted = false;
    private stepTime = 0;
    private impactCooldown = 0;
    start() { if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : .23;
        this.master.connect(this.context.destination);
        for (const frequency of [58, 116]) {
            const o = this.context.createOscillator();
            const g = this.context.createGain();
            o.frequency.value = frequency;
            g.gain.value = .018;
            o.connect(g).connect(this.master);
            o.start();
        }
    } void this.context.resume(); }
    toggle() { this.muted = !this.muted; if (this.master)
        this.master.gain.value = this.muted ? 0 : .23; return this.muted; }
    tone(frequency: number, duration = .12, type: OscillatorType = 'sine', gain = .2, end = frequency / 2) { if (!this.context || !this.master)
        return; const t = this.context.currentTime; const o = this.context.createOscillator(); const g = this.context.createGain(); o.type = type; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.001, t + duration); o.connect(g).connect(this.master); o.start(); o.stop(t + duration); }
    impact(strength: number) { if (this.impactCooldown > 0)
        return; this.tone(65, .09, 'triangle', Math.min(.3, strength * .006), 28); this.impactCooldown = .1; }
    jump() { this.tone(240, .16, 'sine', .25, 440); }
    land(speed: number) { this.tone(90, .12, 'triangle', Math.min(.6, speed * .045), 35); }
    fail() { this.tone(210, .28, 'sawtooth', .15, 45); }
    checkpoint() { this.tone(520, .2, 'sine', .25, 780); }
    success() { [0, 1, 2, 3].forEach(i => setTimeout(() => this.tone(330 * [1, 1.25, 1.5, 2][i], .35, 'sine', .25, 660), i * 120)); }
    update(dt: number, walking: boolean, rolling: number, paused: boolean) { if (this.master)
        this.master.gain.value = this.muted || paused ? 0 : .23; if (paused)
        return; this.stepTime -= dt; this.impactCooldown -= dt; if (walking && this.stepTime <= 0) {
        this.tone(95, .055, 'triangle', .13, 45);
        this.stepTime = .28;
    } if (rolling > .4 && this.impactCooldown <= 0) {
        this.tone(45 + rolling * 15, .08, 'triangle', Math.min(.15, rolling * .035), 35);
        this.impactCooldown = .13;
    } }
    dispose() { void this.context?.close(); }
}
