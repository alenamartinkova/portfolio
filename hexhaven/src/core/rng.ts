export interface RandomDraw {
  readonly value: number;
  readonly rng: number;
}

/** Mulberry32: advance the serialized uint32 state and return a value in [0, 1). */
export function nextRandom(rng: number): RandomDraw {
  const next = (rng + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(next ^ (next >>> 15), next | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, rng: next };
}

export function shuffle<T>(
  items: readonly T[],
  rng: number,
): { readonly items: T[]; readonly rng: number } {
  const result = [...items];
  let cursor = rng >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextRandom(cursor);
    cursor = draw.rng;
    const other = Math.floor(draw.value * (index + 1));
    const first = result[index];
    const second = result[other];
    if (first === undefined || second === undefined) {
      throw new RangeError('Cannot shuffle sparse arrays or undefined items.');
    }
    result[index] = second;
    result[other] = first;
  }
  return { items: result, rng: cursor };
}
