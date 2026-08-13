/**
 * Cursor bricks are rasterised at runtime so they can follow the accent colour
 * and the theme. PNG rather than SVG because Safari ignores SVG cursors and
 * would silently fall back to the system arrow.
 */

export const CURSORS = [
  { id: 'brick', label: 'brick' },
  { id: 'plate', label: 'plate' },
  { id: 'stud', label: 'stud' },
  { id: 'off', label: 'off' },
]

const SHAPES = {
  brick: (body, stud, edge) => `
    <rect x="8.6" y="4.8" width="6.2" height="5.2" rx="1.6" fill="${stud}"/>
    <rect x="17.2" y="4.8" width="6.2" height="5.2" rx="1.6" fill="${stud}"/>
    <rect x="4.6" y="9" width="22.8" height="16.2" rx="2.6" fill="${body}"/>
    <path d="M9 15.5h14" stroke="${edge}" stroke-opacity="0.28" stroke-width="1.3"
          stroke-linecap="round" fill="none"/>`,
  plate: (body, stud, edge) => `
    <rect x="8.6" y="7.4" width="6.2" height="4.6" rx="1.5" fill="${stud}"/>
    <rect x="17.2" y="7.4" width="6.2" height="4.6" rx="1.5" fill="${stud}"/>
    <rect x="4.6" y="11.2" width="22.8" height="9.4" rx="2.2" fill="${body}"/>`,
  stud: (body, stud) => `
    <circle cx="16" cy="16" r="10.6" fill="${body}"/>
    <circle cx="16" cy="16" r="5" fill="${stud}"/>`,
}

function toSvg(shape, body, stud, edge) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
<g stroke="${edge}" stroke-width="1.6" stroke-linejoin="round">${SHAPES[shape](body, stud, edge)}</g>
</svg>`
}

function parseHex(value) {
  const hex = value.trim().replace('#', '')
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(c => c + c)
          .join('')
      : hex
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
}

/** Mixes a colour toward black; used for the brick outline. */
function shade(value, amount) {
  const [r, g, b] = parseHex(value)
  const mix = c => Math.round(c * (1 - amount))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function rasterise(svg) {
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      canvas.getContext('2d').drawImage(image, 0, 0, 32, 32)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve(null)
    image.src =
      'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  })
}

/**
 * Rebuilds both cursor variants from the accent tokens currently in effect and
 * publishes them as custom properties. Falls back silently: if anything fails
 * the CSS defaults in base.css still apply.
 */
export async function applyCursor(shape) {
  const root = document.documentElement

  if (shape === 'off' || !SHAPES[shape]) {
    root.style.removeProperty('--cursor-default')
    root.style.removeProperty('--cursor-pointer')
    return
  }

  const styles = getComputedStyle(root)
  const accent = styles.getPropertyValue('--accent').trim()
  const bright = styles.getPropertyValue('--accent-bright').trim()
  if (!accent.startsWith('#')) return

  const [normal, active] = await Promise.all([
    rasterise(toSvg(shape, accent, bright, shade(accent, 0.62))),
    rasterise(toSvg(shape, bright, accent, shade(bright, 0.62))),
  ])

  if (normal) root.style.setProperty('--cursor-default', `url("${normal}")`)
  if (active) root.style.setProperty('--cursor-pointer', `url("${active}")`)
}
