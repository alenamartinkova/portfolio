import { memo, useMemo } from 'react'
import { COLOURS, footprint, brickKey } from '../models.js'

const colours = new Map(COLOURS.map(colour => [colour.id, colour.hex]))
const project = (x, z, y) => [(x + z) * 6, (x - z) * 3 - y * 2.5]
function shade(hex, amount) {
  const number = parseInt(hex.slice(1), 16)
  return (
    '#' +
    [(number >> 16) & 255, (number >> 8) & 255, number & 255]
      .map(channel =>
        Math.round(Math.min(255, channel * amount))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

// Lightweight React SVG previews keep Three.js off the collection screen.
export default memo(function BrickPreview({ bricks, label }) {
  const drawing = useMemo(() => {
    const points = []
    const shapes = [...bricks]
      .sort((a, b) => (a.x - a.z - b.x + b.z) * 4 + a.y - b.y)
      .map(brick => {
        const { w, d, h } = footprint(brick),
          top = brick.y + h
        const color = colours.get(brick.color)
        const point = (x, z, y) => {
          const p = project(x, z, y)
          points.push(p)
          return p.join(',')
        }
        const a = point(brick.x, brick.z, top),
          b = point(brick.x + w, brick.z, top)
        const c = point(brick.x + w, brick.z + d, top),
          e = point(brick.x, brick.z + d, top)
        const f = point(brick.x + w, brick.z + d, brick.y),
          g = point(brick.x + w, brick.z, brick.y)
        const j = point(brick.x, brick.z, brick.y)
        const studs = []
        for (let x = 0; x < w; x++)
          for (let z = 0; z < d; z++) {
            const [cx, cy] = project(brick.x + x + 0.5, brick.z + z + 0.5, top)
            studs.push(
              <ellipse
                key={`${x}-${z}`}
                cx={cx}
                cy={cy - 0.7}
                rx="2.1"
                ry="1.25"
                fill={shade(color, 1.12)}
                stroke={shade(color, 0.8)}
                strokeWidth=".4"
              />
            )
          }
        return (
          <g key={brickKey(brick)}>
            <polygon points={`${a} ${b} ${g} ${j}`} fill={shade(color, 0.77)} />
            <polygon points={`${b} ${c} ${f} ${g}`} fill={shade(color, 0.58)} />
            <polygon
              points={`${a} ${b} ${c} ${e}`}
              fill={shade(color, 1.07)}
              stroke="#ffffff35"
              strokeWidth=".4"
            />
            {studs}
          </g>
        )
      })
    if (!points.length) return { shapes, viewBox: '0 0 100 100' }
    const xs = points.map(p => p[0]),
      ys = points.map(p => p[1])
    const minX = Math.min(...xs),
      minY = Math.min(...ys)
    return {
      shapes,
      viewBox: `${minX - 12} ${minY - 15} ${Math.max(...xs) - minX + 24} ${Math.max(...ys) - minY + 27}`,
    }
  }, [bricks])
  return (
    <svg
      viewBox={drawing.viewBox}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {drawing.shapes}
    </svg>
  )
})
