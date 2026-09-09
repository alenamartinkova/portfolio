export class GameAudio {
  private ctx?: AudioContext;
  private engine?: OscillatorNode;
  private motorGain?: GainNode;
  private master?: GainNode;
  private phase = 0;
  private beepAt = 0;
  muted = false;
  async start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.24;
    this.master.connect(this.ctx.destination);
    this.engine = this.ctx.createOscillator();
    this.engine.type = "sawtooth";
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 240;
    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.value = 0;
    this.engine.connect(filter);
    filter.connect(this.motorGain);
    this.motorGain.connect(this.master);
    this.engine.start();
  }
  update(dt: number, speed: number, hydraulic: number, paused: boolean) {
    if (!this.ctx || !this.engine || !this.motorGain) return;
    this.phase += dt;
    this.master!.gain.setTargetAtTime(
      this.muted || paused ? 0 : 0.24,
      this.ctx.currentTime,
      0.08,
    );
    this.engine.frequency.setTargetAtTime(
      38 + Math.abs(speed) * 12,
      this.ctx.currentTime,
      0.1,
    );
    this.motorGain.gain.setTargetAtTime(
      0.07 + Math.abs(speed) * 0.012,
      this.ctx.currentTime,
      0.1,
    );
    if (speed < -0.4 && this.phase > this.beepAt && !paused) {
      this.tone(850, 0.12, 0.12);
      this.beepAt = this.phase + 0.85;
    }
    if (hydraulic && this.phase > this.beepAt && !paused) {
      this.tone(190 + Math.sin(this.phase * 9) * 15, 0.1, 0.025);
      this.beepAt = this.phase + 0.09;
    }
  }
  private tone(freq: number, duration: number, volume: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + duration);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  impact(strength: number) {
    this.tone(55 + Math.random() * 65, 0.2, Math.min(0.6, strength * 0.08));
  }
  success() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.3, 0.14), i * 130),
    );
  }
  toggle() {
    this.muted = !this.muted;
    return this.muted;
  }
  dispose() {
    void this.ctx?.close();
  }
}
