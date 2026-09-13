export class RampAudio {
  private context?: AudioContext;
  private gain?: GainNode;
  private motor?: OscillatorNode;
  private disposed = false;
  private lastBeep = 0;
  private paused = true;
  private transition = Promise.resolve();
  enabled = false;
  async toggle() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.motor = this.context.createOscillator();
      this.motor.type = "triangle";
      this.motor.frequency.value = 82;
      this.motor.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.motor.start();
    }
    this.enabled = !this.enabled;
    this.gain!.gain.setTargetAtTime(
      this.enabled ? 0.025 : 0,
      this.context.currentTime,
      0.1,
    );
    await this.syncState();
  }
  pause(paused: boolean) {
    this.paused = paused;
    void this.syncState();
  }
  private syncState() {
    // A pending resume can otherwise complete after suspend and leave a hidden tab audible.
    // Serialize browser transitions and read the latest desired state when each one starts.
    this.transition = this.transition
      .then(async () => {
        if (!this.context || this.disposed) return;
        if (this.paused || !this.enabled) await this.context.suspend();
        else await this.context.resume();
      })
      .catch(() => {});
    return this.transition;
  }
  reverse(time: number) {
    if (time - this.lastBeep > 1.1) {
      this.lastBeep = time;
      this.beep(640, 0.12);
    }
  }
  beep(frequency = 440, duration = 0.08) {
    if (!this.enabled || !this.context || this.disposed) return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain(),
      now = this.context.currentTime;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start();
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.motor?.stop();
    this.motor?.disconnect();
    this.gain?.disconnect();
    void this.context?.close();
  }
}
