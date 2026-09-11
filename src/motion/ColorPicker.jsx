import { useEffect, useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import '../../shared/styles/color-picker.css'

import { ACCENTS } from '../../shared/appearance.js'
export { ACCENTS, readAccent } from '../../shared/appearance.js'

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
