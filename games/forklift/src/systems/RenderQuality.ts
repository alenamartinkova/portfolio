/** Native-density rendering, bounded by the number of pixels rather than inverted DPR. */
export function renderScale(width: number, height: number, devicePixelRatio: number) {
  const density = Math.max(1, Math.min(2, devicePixelRatio || 1));
  const pixelBudget = 5_000_000;
  return Math.max(1 / density, Math.sqrt(Math.max(1, width * height) / pixelBudget));
}
