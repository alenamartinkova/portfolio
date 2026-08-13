import { useEffect, useRef, useState } from 'react'
import './Customizer.css'
import { Palette } from 'lucide-react'
import { CURSORS, applyCursor } from '../cursors'

const ACCENTS = [
  { id: 'violet', label: 'violet', swatch: '#9c6bff' },
  { id: 'cyan', label: 'cyan', swatch: '#45d8d0' },
  { id: 'lime', label: 'lime', swatch: '#a6e34d' },
  { id: 'amber', label: 'amber', swatch: '#f0b23c' },
  { id: 'rose', label: 'rose', swatch: '#ff6b9c' },
  { id: 'blue', label: 'blue', swatch: '#6b8bff' },
]

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked — the choice still applies for this session.
  }
}

export default function Customizer() {
  const [open, setOpen] = useState(false)
  const [accent, setAccent] = useState(() => read('accent', 'violet'))
  const [cursor, setCursor] = useState(() => read('cursor', 'brick'))
  const panelRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    // Violet is the base token set, so it carries no attribute at all.
    if (accent === 'violet') delete root.dataset.accent
    else root.dataset.accent = accent
    write('accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.cursor = cursor
    write('cursor', cursor)
  }, [cursor])

  // The brick is drawn from the accent tokens in effect, so it has to be
  // redrawn whenever the accent *or* the theme changes.
  useEffect(() => {
    applyCursor(cursor)

    const observer = new MutationObserver(() => applyCursor(cursor))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent'],
    })
    return () => observer.disconnect()
  }, [cursor, accent])

  useEffect(() => {
    if (!open) return

    const onPointerDown = event => {
      if (!panelRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="custom" ref={panelRef}>
      <button
        type="button"
        className={`custom__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label="Appearance settings"
        title="Appearance"
      >
        <Palette aria-hidden="true" />
      </button>

      {open && (
        <div className="custom__panel">
          <fieldset className="custom__group">
            <legend>accent</legend>
            <div className="custom__swatches">
              {ACCENTS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`custom__swatch${accent === item.id ? ' is-active' : ''}`}
                  style={{ '--swatch': item.swatch }}
                  onClick={() => setAccent(item.id)}
                  aria-pressed={accent === item.id}
                  aria-label={item.label}
                  title={item.label}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="custom__group">
            <legend>cursor</legend>
            <div className="custom__options">
              {CURSORS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`custom__option${cursor === item.id ? ' is-active' : ''}`}
                  onClick={() => setCursor(item.id)}
                  aria-pressed={cursor === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
