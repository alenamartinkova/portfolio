import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import './ColorPicker.css'

export const ACCENTS = [
  { id: 'violet', color: '#9c6bff', sk: 'Fialová', en: 'Violet' },
  { id: 'cyan', color: '#45d8d0', sk: 'Tyrkysová', en: 'Cyan' },
  { id: 'lime', color: '#a6e34d', sk: 'Limetková', en: 'Lime' },
  { id: 'amber', color: '#f0b23c', sk: 'Jantárová', en: 'Amber' },
  { id: 'rose', color: '#ff6b9c', sk: 'Ružová', en: 'Rose' },
  { id: 'blue', color: '#6b8bff', sk: 'Modrá', en: 'Blue' },
]

export function readAccent() {
  try {
    const saved = localStorage.getItem('motion-accent') || localStorage.getItem('accent')
    return ACCENTS.find(item => item.id === saved) || ACCENTS[0]
  } catch { return ACCENTS[0] }
}

export default function ColorPicker({ accent, onChange, locale }) {
  const [open, setOpen] = useState(false)
  const panel = useRef(null)
  const trigger = useRef(null)
  const label = locale === 'sk' ? 'Farba stránky' : 'Accent color'

  useEffect(() => {
    if (!open) return
    const outside = event => {
      if (!panel.current?.contains(event.target)) setOpen(false)
    }
    const escape = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div className="m-color-picker" ref={panel} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} className="m-color-trigger" aria-label={label} title={label} aria-expanded={open} aria-controls="motion-colors" onClick={() => setOpen(value => !value)}><Palette size={18} aria-hidden="true" /></button>
    {open && <fieldset className="m-color-panel" id="motion-colors"><legend className="m-sr">{label}</legend><p aria-hidden="true">{label}</p><div>{ACCENTS.map(item => <button key={item.id} style={{ '--swatch': item.color }} aria-label={item[locale]} title={item[locale]} aria-pressed={accent.id === item.id} onClick={() => onChange(item)}>{accent.id === item.id && <Check size={18} aria-hidden="true" />}</button>)}</div></fieldset>}
  </div>
}
