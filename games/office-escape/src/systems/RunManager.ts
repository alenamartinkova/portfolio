export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class RunManager {
  seconds = 0;
  falls = 0;
  started = false;
  finished = false;
  best: number | null = null;
  constructor(
    private storage?: StorageLike,
    private levelId = 'legacy',
  ) {
    try {
      const raw = storage?.getItem(`office-escape:best:v2:${this.levelId}`);
      const v = Number(raw);
      if (raw && Number.isFinite(v) && v > 0) this.best = v;
    } catch {
      /* Storage may be disabled. The run still works. */
    }
  }
  update(dt: number, moving: boolean) {
    if (moving) this.started = true;
    if (this.started && !this.finished) this.seconds += dt;
  }
  finish() {
    if (this.finished) return;
    this.finished = true;
    if (this.best === null || this.seconds < this.best) {
      this.best = this.seconds;
      try {
        this.storage?.setItem(`office-escape:best:v2:${this.levelId}`, String(this.best));
      } catch {
        /* Session best is retained. */
      }
    }
  }
  reset() {
    this.seconds = 0;
    this.falls = 0;
    this.started = false;
    this.finished = false;
  }
}
export function formatTime(seconds: number | null) {
  if (seconds === null) return '— — : — —';
  const ms = Math.floor(seconds * 1000);
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
