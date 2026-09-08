import { useEffect, useId, useRef, useState } from 'react'
import { Expand, Minimize2, Scan } from 'lucide-react'
import { useT } from '../i18n'

export default function Blueprint({
  canvasRef,
  name,
  maxLayer,
  studio,
  expanded,
  onExpand,
  hidden,
}) {
  const t = useT()
  const dialogRef = useRef(null)
  const toggleRef = useRef(null)
  const titleId = useId()
  const [peel, setPeel] = useState(maxLayer)

  useEffect(() => {
    const dialog = dialogRef.current
    // Keep the same canvas and camera while promoting the preview to the top
    // layer. Native modality handles focus trapping and makes the game inert.
    if (expanded) {
      dialog.close()
      dialog.showModal()
      toggleRef.current.focus()
      return () => {
        dialog.close()
        dialog.show()
        toggleRef.current?.focus()
      }
    }
  }, [expanded])

  return (
    <dialog
      open
      ref={dialogRef}
      className={`game-panel game-reference${expanded ? ' is-expanded' : ''}`}
      role={expanded ? 'dialog' : 'region'}
      aria-modal={expanded || undefined}
      aria-labelledby={titleId}
      hidden={hidden}
      onCancel={event => {
        event.preventDefault()
        onExpand(false)
      }}
      onClick={event => {
        if (!expanded || event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onExpand(false)
      }}
    >
      <div className="game-reference-heading">
        <div>
          <p className="game-eyebrow">{t.reference}</p>
          <h2 id={titleId}>{name}</h2>
        </div>
        <button
          ref={toggleRef}
          className="game-reference-toggle"
          aria-label={expanded ? t.shrink : t.expand}
          title={expanded ? t.shrink : t.expand}
          aria-expanded={expanded}
          onClick={() => onExpand(!expanded)}
        >
          {expanded ? <Minimize2 /> : <Expand />}
          <span>{expanded ? t.close : t.enlarge}</span>
        </button>
      </div>
      <div className="game-reference-canvas" ref={canvasRef} />
      <div className="game-reference-navigation">
        <p className="game-reference-hint">{t.referenceHint}</p>
        <button
          className="game-icon-button"
          title={t.resetReference}
          aria-label={t.resetReference}
          onClick={() => studio?.referenceFrame()}
        >
          <Scan />
        </button>
      </div>
      <label className="game-peel">
        <span>
          {t.layers}
          <span>
            {peel === maxLayer
              ? t.allLayers
              : peel === 0
                ? t.baseplate
                : t.layer((peel / 3).toFixed(peel % 3 ? 1 : 0))}
          </span>
        </span>
        <input
          type="range"
          min="0"
          max={maxLayer}
          value={peel}
          onChange={event => {
            const value = Number(event.target.value)
            setPeel(value)
            studio?.setPeel(value)
          }}
        />
      </label>
    </dialog>
  )
}
