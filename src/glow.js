/**
 * Lets the background bloom (body::after in base.css) trail the pointer.
 *
 * The gradient position comes from --glow-x/--glow-y; without this script the
 * CSS fallbacks keep the bloom parked at the top of the page. The trailing
 * ease makes it feel like light, not like a cursor decoration.
 */
export function initGlow() {
  // Meaningless on touch — there is no pointer to follow.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const root = document.documentElement

  let targetX = window.innerWidth / 2
  let targetY = 0
  let x = targetX
  let y = targetY
  let frame = null

  const paint = () => {
    frame = null
    // Trail with a light ease; reduced motion snaps straight to the pointer.
    const ease = reduced.matches ? 1 : 0.1
    x += (targetX - x) * ease
    y += (targetY - y) * ease
    root.style.setProperty('--glow-x', `${x.toFixed(1)}px`)
    root.style.setProperty('--glow-y', `${y.toFixed(1)}px`)
    if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) schedule()
  }

  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(paint)
  }

  window.addEventListener(
    'pointermove',
    event => {
      targetX = event.clientX
      targetY = event.clientY
      schedule()
    },
    { passive: true }
  )
}
