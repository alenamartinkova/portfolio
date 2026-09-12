export function hash(text: string): number {
  let value = 2166136261;
  for (const char of text)
    value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

export function random(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function levelSpec(index: number, dailyDate?: string) {
  const seed = hash(dailyDate ? `desk-v1:${dailyDate}` : `evening-v1:${index}`);
  const evening = dailyDate ? 2 : Math.floor(index / 4);
  return {
    seed,
    evening,
    mode:
      (dailyDate ? seed % 2 : index % 4 < 2 ? 0 : 1) === 0
        ? ('untangle' as const)
        : ('drawer' as const),
    cableCount: 4 + evening * 2,
    width: evening === 0 ? 6 : 8,
    depth: evening === 2 ? 5 : 4,
  };
}
