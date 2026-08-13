import { useState } from 'react'
import './StackDiagram.css'
import { useT } from '../i18n'

const BOX_W = 186
const BOX_H = 76

/**
 * Each layer offers the alternatives actually used across the projects listed
 * on this page — swapping one re-labels the node without changing the shape of
 * the system, which is the point: the architecture outlives the tool choice.
 */
const LAYERS = {
  client: {
    x: 16,
    y: 56,
    icon: 'monitor',
    options: [
      { name: 'React', usedIn: ['Rankacy', 'SVX', 'Moravio', 'WAPS'] },
      { name: 'Vue', usedIn: ['GIMMEDATA', 'Moravio'] },
    ],
  },
  api: {
    x: 266,
    y: 56,
    icon: 'server',
    accent: true,
    options: [
      { name: 'FastAPI', usedIn: ['Rankacy', 'SVX'] },
      { name: 'Django', usedIn: ['Rankacy'] },
      { name: 'Laravel', usedIn: ['Moravio', 'WAPS'] },
      { name: 'Node', usedIn: ['Moravio'] },
    ],
  },
  queue: {
    x: 516,
    y: 56,
    icon: 'queue',
    options: [{ name: 'RabbitMQ', usedIn: ['Rankacy'] }],
  },
  workers: {
    x: 766,
    y: 56,
    icon: 'cpu',
    options: [
      { name: 'Python', usedIn: ['Rankacy'] },
      { name: 'PHP', usedIn: ['Moravio', 'WAPS'] },
    ],
  },
  database: {
    x: 266,
    y: 232,
    icon: 'database',
    options: [
      { name: 'PostgreSQL', usedIn: ['Rankacy', 'SVX'] },
      { name: 'MySQL', usedIn: ['Moravio'] },
      // No project on this page to attribute it to, so it carries no credits.
      { name: 'NoSQL' },
    ],
  },
  cache: {
    x: 516,
    y: 232,
    icon: 'bolt',
    options: [{ name: 'Redis', usedIn: ['Rankacy'] }],
  },
}

const NODE_KEYS = Object.keys(LAYERS)

// `len` is the path length in user units — the packet animation is timed from
// it so every wire moves at the same speed regardless of how long it is.
const LINKS = [
  { from: 'client', to: 'api', d: 'M202 94 H266', len: 64, label: 'HTTPS', lx: 234, ly: 84 },
  { from: 'api', to: 'queue', d: 'M452 94 H516', len: 64, label: 'publish', lx: 484, ly: 84, async: true },
  { from: 'queue', to: 'workers', d: 'M702 94 H766', len: 64, label: 'consume', lx: 734, ly: 84, async: true },
  { from: 'api', to: 'database', d: 'M359 132 V232', len: 100, label: 'SQL', lx: 373, ly: 203, anchor: 'start' },
  // Label sits below its own line — above it collided with the workers→database
  // run at y=155.
  { from: 'api', to: 'cache', d: 'M359 170 H562 V232', len: 265, label: 'read', lx: 462, ly: 183 },
  { from: 'workers', to: 'cache', d: 'M859 132 V196 H656 V232', len: 303, label: 'write', lx: 758, ly: 187 },
  // Branches off the same workers trunk at y=155, mirroring the API side.
  // Labelled by protocol, not direction — workers both read and write here.
  { from: 'workers', to: 'database', d: 'M859 155 H410 V232', len: 526, label: 'SQL', lx: 560, ly: 146 },
]

const SCENARIOS = [
  { id: 'all', links: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'request', links: [0, 4, 3] },
  { id: 'job', links: [1, 2, 5, 6] },
]

const PORTS = [
  [202, 94], [266, 94], [452, 94], [516, 94], [702, 94], [766, 94],
  [359, 132], [859, 132], [359, 232], [410, 232], [562, 232], [656, 232],
]

// Where a branch leaves a shared trunk.
const JUNCTIONS = [
  [359, 170],
  [859, 155],
]

// 16×16 glyphs, stroked — one per node type.
const ICONS = {
  monitor: ['M1.5 2.5h13v8h-13z', 'M5.5 13.5h5', 'M8 10.5v3'],
  server: ['M1.5 2.5h13v4h-13z', 'M1.5 9.5h13v4h-13z', 'M4 4.5h1', 'M4 11.5h1'],
  queue: ['M2.5 3.5v9', 'M6.5 3.5v9', 'M10.5 3.5v9', 'M14.5 3.5v9'],
  cpu: ['M4.5 4.5h7v7h-7z', 'M8 1.5v3', 'M8 11.5v3', 'M1.5 8h3', 'M11.5 8h3'],
  database: [
    'M2.5 4c0-1.1 2.5-2 5.5-2s5.5.9 5.5 2v8c0 1.1-2.5 2-5.5 2s-5.5-.9-5.5-2z',
    'M13.5 4c0 1.1-2.5 2-5.5 2s-5.5-.9-5.5-2',
  ],
  bolt: ['M9 1.5 3.5 9h4l-.5 5.5L12.5 7h-4z'],
}

const DEFAULT_CHOICES = Object.fromEntries(
  NODE_KEYS.map(key => [key, LAYERS[key].options[0].name])
)

export default function StackDiagram() {
  const t = useT()
  const [scenario, setScenario] = useState(SCENARIOS[0])
  const [selected, setSelected] = useState(null)
  const [choices, setChoices] = useState(DEFAULT_CHOICES)

  const activeLinks = new Set(scenario.links)
  const activeNodes = new Set(
    scenario.id === 'all'
      ? NODE_KEYS
      : scenario.links.flatMap(i => [LINKS[i].from, LINKS[i].to])
  )

  const detail = selected ? LAYERS[selected] : null
  const activeOption = detail?.options.find(o => o.name === choices[selected])

  return (
    <div className="diagram panel">
      <div className="panel__chrome">
        <span className="panel__chrome-dot panel__chrome-dot--accent" />
        architecture.svg
      </div>

      <div className="diagram__toolbar" role="tablist" aria-label="Flow">
        {SCENARIOS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={scenario.id === item.id}
            className={`diagram__tab${scenario.id === item.id ? ' is-active' : ''}`}
            onClick={() => setScenario(item)}
          >
            {t.diagram.scenarios[item.id]}
          </button>
        ))}
        <span className="diagram__hint">{t.diagram.hint}</span>
      </div>

      <div className="diagram__scroll">
        <svg
          className="diagram__svg"
          viewBox="0 0 1000 386"
          aria-label={t.diagram.aria}
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

          <rect width="1000" height="386" fill="url(#diagram-dots)" />

          {/* Every service ships as a container, the client included. */}
          <g className="diagram__group diagram__group--runtime">
            <rect x="4" y="24" width="964" height="316" rx="12" />
            <text x="18" y="42">
              docker
            </text>
          </g>

          <g className="diagram__group">
            <rect x="250" y="210" width="468" height="112" rx="10" />
            <text x="264" y="227">
              data layer
            </text>
          </g>

          {LINKS.map((link, index) => {
            const on = activeLinks.has(index)
            return (
              <g
                key={link.d}
                className={`diagram__wire${on ? '' : ' is-dimmed'}`}
              >
                <path
                  className={`diagram__link${link.async ? ' diagram__link--async' : ''}`}
                  d={link.d}
                  markerEnd="url(#diagram-arrow)"
                />
                {on && (
                  <path
                    className="diagram__pulse"
                    d={link.d}
                    style={{
                      '--len': link.len,
                      animationDuration: `${(link.len / 80).toFixed(2)}s`,
                      animationDelay: `${index * 0.32}s`,
                    }}
                  />
                )}
                <text
                  className="diagram__link-label"
                  x={link.lx}
                  y={link.ly}
                  textAnchor={link.anchor || 'middle'}
                >
                  {link.label}
                </text>
              </g>
            )
          })}

          {PORTS.map(([x, y]) => (
            <circle className="diagram__port" key={`${x}-${y}`} cx={x} cy={y} r="2.5" />
          ))}

          {JUNCTIONS.map(([x, y]) => (
            <circle
              className="diagram__junction"
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="3"
            />
          ))}

          {NODE_KEYS.map(key => {
            const node = LAYERS[key]
            const dimmed = !activeNodes.has(key)
            const isSelected = selected === key
            const swappable = node.options.length > 1

            return (
              <g
                key={key}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${key}: ${choices[key]}`}
                className={[
                  'diagram__node',
                  node.accent ? 'diagram__node--accent' : '',
                  dimmed ? 'is-dimmed' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelected(isSelected ? null : key)}
                onKeyDown={event => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setSelected(isSelected ? null : key)
                }}
              >
                <rect x={node.x} y={node.y} width={BOX_W} height={BOX_H} rx="8" />
                <text className="diagram__key" x={node.x + 18} y={node.y + 28}>
                  {key}
                </text>
                <text className="diagram__name" x={node.x + 18} y={node.y + 53}>
                  {choices[key]}
                </text>
                <g
                  className="diagram__icon"
                  transform={`translate(${node.x + BOX_W - 34} ${node.y + 16})`}
                >
                  {ICONS[node.icon].map(d => (
                    <path key={d} d={d} />
                  ))}
                </g>
                {swappable && (
                  <text
                    className="diagram__swap"
                    x={node.x + BOX_W - 18}
                    y={node.y + BOX_H - 10}
                    textAnchor="end"
                  >
                    {node.options.length}
                  </text>
                )}
              </g>
            )
          })}

          <g className="diagram__legend">
            <path className="diagram__link" d="M16 366 H44" />
            <text x="52" y="370">
              sync
            </text>
            <path className="diagram__link diagram__link--async" d="M104 366 H132" />
            <text x="140" y="370">
              async
            </text>
          </g>
        </svg>
      </div>

      {detail && (
        <div className="diagram__detail">
          <div className="diagram__detail-head">
            <p className="diagram__detail-key">{selected}</p>
            <button
              type="button"
              className="diagram__close"
              onClick={() => setSelected(null)}
              aria-label={t.diagram.close}
            >
              esc ×
            </button>
          </div>

          <p className="diagram__detail-blurb">{t.diagram.layers[selected]}</p>

          {detail.options.length > 1 && (
            <div className="diagram__options">
              <span className="diagram__options-key">{t.diagram.swap}</span>
              <div className="chip-row">
                {detail.options.map(option => (
                  <button
                    key={option.name}
                    type="button"
                    className={`chip${choices[selected] === option.name ? ' chip--accent' : ''}`}
                    onClick={() =>
                      setChoices(current => ({ ...current, [selected]: option.name }))
                    }
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Credits follow the selected technology, not the layer — picking
              PHP should surface Moravio, not whatever the default was. */}
          {activeOption?.usedIn?.length > 0 && (
            <p className="diagram__detail-used">
              <span className="diagram__options-key">
                {choices[selected]} {t.diagram.usedIn}
              </span>
              {activeOption.usedIn.join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
