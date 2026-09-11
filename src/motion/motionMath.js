export const clamp = value => Math.max(0, Math.min(1, value))

// Finish entrances before the content reaches the reading area of the viewport.
export const entranceProgress = (top, viewportHeight) =>
  clamp((viewportHeight * .94 - top) / Math.max(1, viewportHeight * .48))

export const countAtProgress = (target, progress) =>
  Math.round(target * (1 - (1 - clamp(progress)) ** 3))

export function activeTimelineIndex(rects, viewportHeight) {
  let active = 0
  rects.forEach((rect, index) => {
    if (rect.top < viewportHeight * .56) active = index
  })
  return active
}
