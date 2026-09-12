import type { CampaignStorage } from '../../../shared/CampaignProgress';
export class DeskProgress {
  completed: number[] = [];
  daily: string[] = [];
  persistent = true;
  constructor(private storage?: CampaignStorage) {
    this.persistent = !!storage;
    try {
      const data = JSON.parse(
        storage?.getItem('cable-management:v1') ?? 'null',
      );
      if (data) {
        if (Array.isArray(data.completed))
          this.completed = [
            ...new Set<number>(
              data.completed.filter(
                (n: number) => Number.isInteger(n) && n >= 0 && n < 12,
              ),
            ),
          ];
        if (Array.isArray(data.daily))
          this.daily = data.daily
            .filter(
              (s: unknown) =>
                typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s),
            )
            .slice(-30);
      }
    } catch {
      /* Invalid saves start a new, playable session. */
    }
  }
  get evenings() {
    return [0, 1, 2].filter((e) =>
      [0, 1, 2, 3].every((n) => this.completed.includes(e * 4 + n)),
    ).length;
  }
  get next() {
    return (
      Array.from({ length: 12 }, (_, n) => n).find(
        (n) => !this.completed.includes(n),
      ) ?? 0
    );
  }
  complete(level: number, dailyDate?: string) {
    if (dailyDate)
      this.daily = [...new Set([...this.daily, dailyDate])].slice(-30);
    else if (!this.completed.includes(level)) this.completed.push(level);
    try {
      this.storage?.setItem(
        'cable-management:v1',
        JSON.stringify({ completed: this.completed, daily: this.daily }),
      );
    } catch {
      this.persistent = false;
    }
  }
}
