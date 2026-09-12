/** Shared battery-conscious defaults for every game renderer. */
export const renderBudget = Object.freeze({
  fps: 60,
  antialias: true,
  samples: 2,
  shadows: false,
  pixels: 1_500_000,
  density: 1.25,
  shadowSize: 1024,
  lampShadowSize: 512,
})

/** @param {number} width @param {number} height @param {number} devicePixelRatio */
export function renderPixelRatio(width, height, devicePixelRatio) {
  const density = Math.max(1, Math.min(renderBudget.density, devicePixelRatio || 1))
  return Math.min(density, Math.sqrt(renderBudget.pixels / Math.max(1, width * height)))
}

/** Babylon uses the inverse of Three.js's pixel ratio. */
/** @param {number} width @param {number} height @param {number} devicePixelRatio */
export function renderScale(width, height, devicePixelRatio) {
  return 1 / renderPixelRatio(width, height, devicePixelRatio)
}

/** One antialiasing path per device; avoid stacked full-screen filters. */
export function renderAntialiasing(maxSamples) {
  const msaa = maxSamples >= renderBudget.samples
  return { samples: msaa ? renderBudget.samples : 1, fxaa: !msaa }
}
