/** Count submitted game frames, never RAF callbacks or individual render passes. */
export function createFpsCounter(now = () => performance.now()) {
  let start = now(), frames = 0
  return {
    frame() { frames++ },
    reset() { start = now(); frames = 0 },
    read() {
      const end = now(), elapsed = end - start
      const fps = elapsed > 0 ? Math.round(frames * 1000 / elapsed) : 0
      start = end; frames = 0
      return fps
    },
  }
}

let activeMeter

/** Call once after the game's main scene was rendered, including single invalidations. */
export function recordRenderedFrame() { activeMeter?.frame() }

/** One DOM update per second while active; no RAF or polling while settled/hidden. */
export function mountFpsMeter() {
  activeMeter?.dispose()
  const badge = document.createElement('div')
  badge.className = 'game-fps'
  badge.textContent = '0 FPS'
  badge.setAttribute('aria-live', 'off')
  Object.assign(badge.style, {
    position: 'fixed', right: 'max(8px, env(safe-area-inset-right))',
    bottom: 'max(6px, env(safe-area-inset-bottom))', zIndex: '100',
    pointerEvents: 'none', padding: '3px 6px', borderRadius: '4px',
    color: '#e8edf2', background: 'rgba(12, 18, 26, .85)',
    font: '11px/1.2 monospace', fontVariantNumeric: 'tabular-nums',
    minWidth: '6ch', textAlign: 'right', contain: 'content',
  })
  document.body.append(badge)
  const counter = createFpsCounter()
  let timer = 0, disposed = false
  function show(fps) {
    const value = `${fps} FPS`
    if (badge.textContent !== value) badge.textContent = value
  }
  function sample() {
    timer = 0
    const fps = counter.read()
    show(fps)
    // One final sample changes a stopped scene to 0, then the meter sleeps too.
    if (fps) timer = window.setTimeout(sample, 1000)
  }
  function reset() { clearTimeout(timer); timer = 0; counter.reset(); show(0) }
  function visibility() { reset() }
  function pagehide(event) { if (event.persisted) reset(); else dispose() }
  function dispose() {
    if (disposed) return
    disposed = true
    reset()
    badge.remove()
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('pagehide', pagehide)
    if (activeMeter === meter) activeMeter = undefined
  }
  const meter = {
    frame() {
      if (disposed || document.hidden) return
      if (!timer) { counter.reset(); timer = window.setTimeout(sample, 1000) }
      counter.frame()
    },
    dispose,
  }
  document.addEventListener('visibilitychange', visibility)
  window.addEventListener('pagehide', pagehide)
  activeMeter = meter
  return dispose
}
