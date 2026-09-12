import { expect, it } from 'vitest';
import { renderScale } from '../src/systems/RenderQuality';

it('uses native pixels on standard and retina screens without inverting their density', () => {
  expect(renderScale(1200, 800, 1)).toBe(1);
  expect(renderScale(1200, 800, 2)).toBe(.5);
  expect(renderScale(390, 608, 3)).toBe(.5);
});

it('bounds large-monitor buffers and remains finite during zero-size layout', () => {
  const scale = renderScale(3840, 2160, 2);
  expect(3840 * 2160 / scale ** 2).toBeLessThanOrEqual(5_000_001);
  expect(renderScale(0, 0, 0)).toBe(1);
});
