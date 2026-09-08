export type SoundEffect = 'dice' | 'place' | 'trade' | 'seven';

interface Note {
  readonly frequency: number;
  readonly delay: number;
  readonly duration: number;
  readonly wave: OscillatorType;
}

const EFFECTS: Readonly<Record<SoundEffect, readonly Note[]>> = {
  dice: [
    { frequency: 340, delay: 0, duration: 0.035, wave: 'triangle' },
    { frequency: 270, delay: 0.05, duration: 0.035, wave: 'triangle' },
    { frequency: 380, delay: 0.1, duration: 0.05, wave: 'triangle' },
  ],
  place: [
    { frequency: 520, delay: 0, duration: 0.06, wave: 'sine' },
    { frequency: 660, delay: 0.04, duration: 0.09, wave: 'sine' },
  ],
  trade: [
    { frequency: 330, delay: 0, duration: 0.12, wave: 'triangle' },
    { frequency: 440, delay: 0.08, duration: 0.12, wave: 'triangle' },
    { frequency: 660, delay: 0.16, duration: 0.16, wave: 'triangle' },
  ],
  seven: [
    { frequency: 190, delay: 0, duration: 0.2, wave: 'sine' },
    { frequency: 130, delay: 0.15, duration: 0.28, wave: 'sine' },
  ],
};

/** Muted until enabled and unlocked from an explicit pointer/key gesture. */
export class SoundPlayer {
  private context: AudioContext | null = null;
  private enabled = false;
  private disposed = false;
  private readonly voices = new Set<OscillatorNode>();

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled && !this.disposed;
    if (!this.enabled) this.stopVoices();
  }

  /** Call synchronously from the gesture handler, after setEnabled(true). */
  async unlock(): Promise<boolean> {
    if (!this.enabled || this.disposed || typeof AudioContext === 'undefined') return false;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context.state === 'running';
    } catch {
      return false;
    }
  }

  play(effect: SoundEffect): void {
    const context = this.context;
    if (!this.enabled || this.disposed || context?.state !== 'running') return;
    const start = context.currentTime;
    for (const note of EFFECTS[effect]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + note.delay;
      oscillator.type = note.wave;
      oscillator.frequency.setValueAtTime(note.frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.035, at + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + note.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.voices.delete(oscillator);
      };
      oscillator.start(at);
      oscillator.stop(at + note.duration + 0.01);
    }
  }

  private stopVoices(): void {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {
        // A just-finished voice may already be waiting for its ended event.
      }
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.enabled = false;
    this.stopVoices();
    const context = this.context;
    this.context = null;
    if (context !== null && context.state !== 'closed') {
      try {
        await context.close();
      } catch {
        // Sound is optional; a device disappearing must not interrupt the game.
      }
    }
    this.voices.clear();
  }
}
