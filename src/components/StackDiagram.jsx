import './StackDiagram.css'

const BOX_W = 186
const BOX_H = 76

const nodes = [
  { key: 'client', name: 'React', x: 16, y: 56, icon: 'monitor' },
  { key: 'api', name: 'FastAPI', x: 266, y: 56, icon: 'server', accent: true },
  { key: 'queue', name: 'RabbitMQ', x: 516, y: 56, icon: 'queue' },
  { key: 'workers', name: 'Python', x: 766, y: 56, icon: 'cpu' },
  { key: 'database', name: 'PostgreSQL', x: 266, y: 232, icon: 'database' },
  { key: 'cache', name: 'Redis', x: 516, y: 232, icon: 'bolt' },
]

// `len` is the path length in user units — the packet animation is timed from
// it so every wire moves at the same speed regardless of how long it is.
const links = [
  { d: 'M202 94 H266', len: 64, label: 'HTTPS', lx: 234, ly: 84 },
  { d: 'M452 94 H516', len: 64, label: 'publish', lx: 484, ly: 84, async: true },
  { d: 'M702 94 H766', len: 64, label: 'consume', lx: 734, ly: 84, async: true },
  { d: 'M359 132 V232', len: 100, label: 'SQL', lx: 373, ly: 203, anchor: 'start' },
  { d: 'M359 170 H562 V232', len: 265, label: 'read', lx: 462, ly: 161 },
  { d: 'M859 132 V196 H656 V232', len: 303, label: 'write', lx: 758, ly: 187 },
]

const ports = [
  [202, 94], [266, 94], [452, 94], [516, 94], [702, 94], [766, 94],
  [359, 132], [859, 132], [359, 232], [562, 232], [656, 232],
]

// 16×16 glyphs, stroked — one per node type.
const icons = {
  monitor: ['M1.5 2.5h13v8h-13z', 'M5.5 13.5h5', 'M8 10.5v3'],
  server: ['M1.5 2.5h13v4h-13z', 'M1.5 9.5h13v4h-13z', 'M4 4.5h1', 'M4 11.5h1'],
  queue: ['M2.5 3.5v9', 'M6.5 3.5v9', 'M10.5 3.5v9', 'M14.5 3.5v9'],
  cpu: [
    'M4.5 4.5h7v7h-7z',
    'M8 1.5v3',
    'M8 11.5v3',
    'M1.5 8h3',
    'M11.5 8h3',
  ],
  database: [
    'M2.5 4c0-1.1 2.5-2 5.5-2s5.5.9 5.5 2v8c0 1.1-2.5 2-5.5 2s-5.5-.9-5.5-2z',
    'M13.5 4c0 1.1-2.5 2-5.5 2s-5.5-.9-5.5-2',
  ],
  bolt: ['M9 1.5 3.5 9h4l-.5 5.5L12.5 7h-4z'],
}

/**
 * The shape of the systems described in the copy above — drawn rather than
 * listed. Hand-authored SVG, themed through the same CSS custom properties.
 */
export default function StackDiagram() {
  return (
    <div className="diagram panel">
      <div className="panel__chrome">
        <span className="panel__chrome-dot panel__chrome-dot--accent" />
        architecture.svg
      </div>

      <div className="diagram__scroll">
        <svg
          className="diagram__svg"
          viewBox="0 0 960 372"
          role="img"
          aria-label="Request flow: a React client calls a FastAPI service over HTTPS; the API publishes to a RabbitMQ queue that Python workers consume; the API reads and writes PostgreSQL and Redis, and workers write back to the cache."
        >
          <defs>
            <marker
              id="diagram-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path className="diagram__arrowhead" d="M0,0 L10,5 L0,10 z" />
            </marker>

            <pattern
              id="diagram-dots"
              width="26"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              <circle className="diagram__canvas-dot" cx="1" cy="1" r="1" />
            </pattern>
          </defs>

          <rect width="960" height="372" fill="url(#diagram-dots)" />

          {/* data layer boundary */}
          <g className="diagram__group">
            <rect x="250" y="208" width="468" height="116" rx="10" />
            <text x="264" y="225">
              data layer
            </text>
          </g>

          {links.map((link, index) => (
            <g key={link.d}>
              <path
                className={`diagram__link${link.async ? ' diagram__link--async' : ''}`}
                d={link.d}
                markerEnd="url(#diagram-arrow)"
              />
              <path
                className="diagram__pulse"
                d={link.d}
                style={{
                  '--len': link.len,
                  animationDuration: `${(link.len / 80).toFixed(2)}s`,
                  animationDelay: `${index * 0.32}s`,
                }}
              />
              <text
                className="diagram__link-label"
                x={link.lx}
                y={link.ly}
                textAnchor={link.anchor || 'middle'}
              >
                {link.label}
              </text>
            </g>
          ))}

          {ports.map(([x, y]) => (
            <circle className="diagram__port" key={`${x}-${y}`} cx={x} cy={y} r="2.5" />
          ))}

          {/* solid junction where the cache read branches off the SQL trunk */}
          <circle className="diagram__junction" cx="359" cy="170" r="3" />

          {nodes.map(node => (
            <g
              key={node.key}
              className={`diagram__node${node.accent ? ' diagram__node--accent' : ''}`}
            >
              <rect x={node.x} y={node.y} width={BOX_W} height={BOX_H} rx="8" />
              <text className="diagram__key" x={node.x + 18} y={node.y + 28}>
                {node.key}
              </text>
              <text className="diagram__name" x={node.x + 18} y={node.y + 53}>
                {node.name}
              </text>
              <g
                className="diagram__icon"
                transform={`translate(${node.x + BOX_W - 34} ${node.y + 16})`}
              >
                {icons[node.icon].map(d => (
                  <path key={d} d={d} />
                ))}
              </g>
            </g>
          ))}

          {/* legend */}
          <g className="diagram__legend">
            <path className="diagram__link" d="M16 352 H44" />
            <text x="52" y="356">
              sync
            </text>
            <path className="diagram__link diagram__link--async" d="M104 352 H132" />
            <text x="140" y="356">
              async
            </text>
          </g>
        </svg>
      </div>
    </div>
  )
}
