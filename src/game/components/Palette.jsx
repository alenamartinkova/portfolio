import { useMemo } from 'react'
import { COLOURS, TYPES } from '../models.js'
import { isSandbox, paletteEntries } from '../state.js'
import { useT } from '../i18n'
import BrickPreview from './BrickPreview'

export default function Palette({ state, dispatch }) {
  const t = useT()
  const entries = paletteEntries(state)
  const visible = entries.filter(entry => {
    const kind = TYPES.find(type => type.id === entry.type).kind
    return (
      state.filter === 'all' ||
      (state.filter === 'special'
        ? ['slope', 'round'].includes(kind)
        : kind === state.filter)
    )
  })
  return (
    <aside className="game-panel game-palette" aria-label={t.yourBricks}>
      <div className="game-palette-heading">
        <h2>{t.yourBricks}</h2>
        <span>
          {isSandbox(state)
            ? t.unlimited
            : t.left(entries.reduce((sum, entry) => sum + entry.count, 0))}
        </span>
      </div>
      <div
        className="game-palette-filters"
        role="group"
        aria-label={t.yourBricks}
      >
        {Object.entries(t.filters).map(([value, label]) => (
          <button
            key={value}
            className={value === state.filter ? 'is-active' : ''}
            aria-pressed={value === state.filter}
            onClick={() => dispatch({ type: 'filter', value })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="game-parts">
        {visible.map(entry => (
          <Part
            key={`${entry.type}-${entry.color}`}
            entry={entry}
            selected={
              entry.type === state.selection.type &&
              entry.color === state.selection.color
            }
            onSelect={() => dispatch({ type: 'select', selection: entry })}
          />
        ))}
        {!visible.length && <p>{t.noParts}</p>}
      </div>
      {isSandbox(state) && (
        <div className="game-colours" role="group" aria-label={t.tools.pick}>
          {COLOURS.map(color => (
            <button
              key={color.id}
              className="game-swatch"
              style={{ backgroundColor: color.hex }}
              aria-label={t.colours[color.id]}
              title={t.colours[color.id]}
              aria-pressed={color.id === state.selection.color}
              onClick={() =>
                dispatch({
                  type: 'select',
                  selection: { ...state.selection, color: color.id },
                })
              }
            />
          ))}
        </div>
      )}
      <p className="game-palette-foot">{t.brickShortcuts}</p>
    </aside>
  )
}
function Part({ entry, selected, onSelect }) {
  const t = useT()
  const type = TYPES.find(type => type.id === entry.type)
  const label = `${type.w} × ${type.d} ${t.kinds[type.kind]}`
  const preview = useMemo(
    () => [{ type: entry.type, color: entry.color, x: 0, y: 0, z: 0, rot: 0 }],
    [entry.type, entry.color]
  )
  return (
    <button
      className={`game-part${selected ? ' is-active' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
      disabled={entry.count <= 0}
      title={`${label} · ${t.colours[entry.color]}`}
    >
      <span className="game-part-preview">
        <BrickPreview bricks={preview} />
      </span>
      <span>
        {label}
        <small>{t.colours[entry.color]}</small>
      </span>
      <span className="game-part-count">
        {entry.count === Infinity ? '∞' : `×${entry.count}`}
      </span>
    </button>
  )
}
