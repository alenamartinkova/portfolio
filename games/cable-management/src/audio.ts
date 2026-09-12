/** Quiet procedural sounds; no downloads, playback or AudioContext before consent. */
export class DeskAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private lastRustle = 0;
  enabled = false;
  async toggle() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.context.destination);
      const buffer = this.context.createBuffer(
        1,
        this.context.sampleRate * 4,
        this.context.sampleRate,
      );
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 0.6;
      }
      const noise = this.context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 210;
      noise.connect(filter);
      filter.connect(this.master);
      noise.start();
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.master!.gain.setTargetAtTime(
      this.enabled ? 0.2 : 0,
      this.context.currentTime,
      0.1,
    );
    return this.enabled;
  }
  pause(hidden: boolean) {
    if (this.context)
      void (hidden
        ? this.context.suspend()
        : this.enabled
          ? this.context.resume()
          : Promise.resolve());
  }
  click(frequency = 420, duration = 0.09) {
    if (!this.enabled || !this.context || !this.master) return;
    const now = this.context.currentTime,
      oscillator = this.context.createOscillator(),
      gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      now + duration,
    );
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start();
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  rustle() {
    if (performance.now() - this.lastRustle > 110) {
      this.click(100, 0.035);
      this.lastRustle = performance.now();
    }
  }
  dispose() {
    void this.context?.close();
  }
}
