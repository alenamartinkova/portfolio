export class ServerAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = false;
  async toggle() {
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain();
        this.master.gain.value = 0; this.master.connect(this.context.destination);
        for (const frequency of [55, 82.4]) {
          const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
          oscillator.type = 'sine'; oscillator.frequency.value = frequency; gain.gain.value = .035;
          oscillator.connect(gain); gain.connect(this.master); oscillator.start();
        }
      }
      await this.context.resume(); this.enabled = !this.enabled;
      this.master!.gain.setTargetAtTime(this.enabled ? 1 : 0, this.context.currentTime, .1);
    } catch { this.enabled = false; }
  }
  suspend(paused: boolean) {
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled && !paused ? 1 : 0, this.context.currentTime, .1);
  }
  ping(incident = false) {
    if (!this.context || !this.master || !this.enabled) return;
    for (let i = 0; i < (incident ? 3 : 2); i++) {
      const o = this.context.createOscillator(), g = this.context.createGain();
      const at = this.context.currentTime + i * .18;
      o.frequency.value = incident ? 880 - i * 100 : 660 + i * 220;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.045, at + .01); g.gain.exponentialRampToValueAtTime(.001, at + .14);
      o.connect(g); g.connect(this.master); o.start(at); o.stop(at + .16);
      o.onended = () => { o.disconnect(); g.disconnect(); };
    }
  }
  dispose() { void this.context?.close(); }
}
