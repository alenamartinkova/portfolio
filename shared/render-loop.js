import { renderBudget } from './render-budget.js'

/**
 * Coalesce invalidations, cap animated frames, and sleep between interactions.
 * Return true from draw to continue animating. Delta excludes idle/hidden time.
 * @param {(now: number, delta: number) => boolean | void} draw
 */
export function createRenderLoop(draw) {
  let animation = 0, disposed = false, drawing = false
  /** @type {number | undefined} */
  let previous
  /** @type {number | undefined} */
  let boundary
  const interval = 1000 / renderBudget.fps
  function request() {
    if (disposed || document.hidden || animation) return
    animation = requestAnimationFrame(frame)
  }
  function stop() {
    cancelAnimationFrame(animation)
    animation = 0
    previous = boundary = undefined
  }
  /** @param {number} now */
  function frame(now) {
    animation = 0
    if (disposed || document.hidden) { stop(); return }
    const elapsed = boundary === undefined ? interval : now - boundary
    if (elapsed < interval - 0.5) { request(); return }
    boundary = elapsed < interval ? now : now - elapsed % interval
    const delta = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.1)
    previous = now
    drawing = true
    try { if (draw(now, delta)) request() }
    finally {
      drawing = false
      if (!animation) previous = boundary = undefined
    }
  }
  function visibility() {
    stop()
    if (!document.hidden) request()
  }
  document.addEventListener('visibilitychange', visibility)
  return {
    request,
    stop,
    get active() { return drawing || Boolean(animation) },
    dispose() {
      disposed = true
      stop()
      document.removeEventListener('visibilitychange', visibility)
    },
  }
}
