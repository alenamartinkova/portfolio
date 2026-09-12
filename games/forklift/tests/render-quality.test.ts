import { expect, it } from 'vitest';
import { renderBudget, renderScale } from '../src/systems/RenderQuality';

it('keeps standard screens sharp and bounds Retina supersampling', () => {
  expect(renderScale(1200, 800, 1)).toBe(1);
  expect(renderScale(1200, 800, 2)).toBe(.8);
  expect(renderScale(390, 608, 3)).toBe(.8);
});

it('bounds large-monitor buffers and remains finite during zero-size layout', () => {
  const scale = renderScale(3840, 2160, 2);
  expect(3840 * 2160 / scale ** 2).toBeLessThanOrEqual(renderBudget.pixels + 1);
  expect(renderScale(0, 0, 0)).toBe(1);
});

it('cuts pixel shading work on laptop displays without changing CSS layout', () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [390, 608]]) {
    const scale = renderScale(width, height, 2);
    const oldPixels = Math.min(width * height * 4, 5_000_000);
    expect(width * height / scale ** 2).toBeLessThan(oldPixels * .4);
  }
});
