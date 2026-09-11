export interface CampaignRecord {
  stars: number;
  bestSeconds: number;
}
export interface CampaignStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A completed run earns one star, a clean run two, and a clean run within par three. */
export function campaignStars(seconds: number, par: number, cleanRun: boolean): number {
  if (!cleanRun) return 1;
  return seconds <= par ? 3 : 2;
}

/** Only completed runs are saved; unavailable storage still allows session progress. */
export class CampaignProgress {
  private records = new Map<string, CampaignRecord>();
  constructor(
    private game: string,
    private storage?: CampaignStorage,
  ) {}
  get(id: string): CampaignRecord | undefined {
    if (this.records.has(id)) return this.records.get(id);
    try {
      const value = JSON.parse(this.storage?.getItem(`${this.game}:campaign:v1:${id}`) ?? 'null');
      if (
        value &&
        Number.isInteger(value.stars) &&
        value.stars >= 1 &&
        value.stars <= 3 &&
        Number.isFinite(value.bestSeconds) &&
        value.bestSeconds > 0
      ) {
        this.records.set(id, value);
        return value;
      }
    } catch {
      /* Corrupt or blocked storage does not prevent play. */
    }
    return undefined;
  }
  complete(id: string, seconds: number, stars: number) {
    if (
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      !Number.isInteger(stars) ||
      stars < 1 ||
      stars > 3
    )
      return;
    const previous = this.get(id);
    const record = {
      stars: Math.max(previous?.stars ?? 0, stars),
      bestSeconds: Math.min(previous?.bestSeconds ?? Infinity, seconds),
    };
    this.records.set(id, record);
    try {
      this.storage?.setItem(`${this.game}:campaign:v1:${id}`, JSON.stringify(record));
    } catch {
      /* Session progress remains available. */
    }
  }
}
export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
