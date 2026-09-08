import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight, Copy, X } from 'lucide-react'
import { useT } from '../i18n'
import { LEVELS } from '../levels.js'
import { encodeBuild } from '../persistence.js'

const formatTime = seconds =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export default function GameDialog({ state, dispatch, storageFailed }) {
  const t = useT()
  const ref = useRef(null)
  const titleId = useId()
  const close = () => dispatch({ type: 'dialog', dialog: null })
  useEffect(() => {
    const dialog = ref.current,
      focus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (focus?.isConnected) focus.focus()
    }
  }, [])
  const titles = {
    help: t.helpTitle,
    settings: t.settingsTitle,
    reset: t.resetTitle,
    saves: t.savesTitle,
    code: t.codeTitle,
    clear: t.clearTitle,
    result: t.resultTitle,
  }
  return (
    <dialog
      ref={ref}
      className="game-dialog"
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault()
        close()
      }}
      onClick={event => {
        if (event.target === ref.current) {
          const rect = ref.current.getBoundingClientRect()
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close()
        }
      }}
    >
      <button
        className="game-icon-button game-dialog-close"
        aria-label={t.close}
        onClick={close}
      >
        <X />
      </button>
      <h2 id={titleId}>{titles[state.dialog]}</h2>
      {state.dialog === 'help' && (
        <>
          <p className="game-dialog-intro">{t.helpIntro}</p>
          <div className="game-help-grid">
            {t.helpSteps.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="game-shortcuts">{t.shortcuts}</p>
          <p className="game-shortcuts">{t.touch}</p>
          <button className="game-primary" onClick={close}>
            {t.back}
            <ArrowRight aria-hidden="true" />
          </button>
        </>
      )}
      {state.dialog === 'settings' && (
        <>
          <p className="game-dialog-intro">{t.localNote}</p>
          <div className="game-setting-row">
            <div>
              {t.sounds}
              <p>{t.soundNote}</p>
            </div>
            <button
              className="game-secondary"
              aria-pressed={!state.saved.muted}
              onClick={() => dispatch({ type: 'mute' })}
            >
              {state.saved.muted ? t.off : t.on}
            </button>
          </div>
          <div className="game-setting-row">
            <span>{t.collection}</span>
            <button
              className="game-secondary"
              onClick={() => dispatch({ type: 'dialog', dialog: 'reset' })}
            >
              {t.reset}
            </button>
          </div>
          <button className="game-primary" onClick={close}>
            {t.back}
          </button>
        </>
      )}
      {state.dialog === 'reset' && (
        <>
          <p className="game-dialog-intro">{t.resetNote}</p>
          <div className="game-dialog-buttons">
            <button
              className="game-secondary"
              onClick={() => dispatch({ type: 'dialog', dialog: 'settings' })}
            >
              {t.cancel}
            </button>
            <button
              className="game-primary"
              onClick={() => dispatch({ type: 'resetProgress' })}
            >
              {t.reset}
            </button>
          </div>
        </>
      )}
      {state.dialog === 'saves' && (
        <>
          <p className="game-dialog-intro">{t.savesNote}</p>
          {state.saved.slots.map((slot, index) => (
            <div className="game-save-slot" key={index}>
              <div>
                <strong>{t.shelf(index + 1)}</strong>
                <small>{slot ? t.pieces(slot.count) : t.emptySlot}</small>
              </div>
              <button
                className="game-secondary"
                onClick={() =>
                  dispatch({ type: 'saveSlot', index, date: Date.now() })
                }
              >
                {t.saveHere}
              </button>
              <button
                className="game-secondary"
                disabled={!slot}
                onClick={() => dispatch({ type: 'loadSlot', index })}
              >
                {t.load}
              </button>
            </div>
          ))}
          <button className="game-primary" onClick={close}>
            {t.back}
          </button>
        </>
      )}
      {state.dialog === 'code' && (
        <BuildCode bricks={state.bricks} dispatch={dispatch} />
      )}
      {state.dialog === 'clear' && (
        <>
          <p className="game-dialog-intro">{t.clearNote}</p>
          <div className="game-dialog-buttons">
            <button className="game-secondary" onClick={close}>
              {t.cancel}
            </button>
            <button
              className="game-primary"
              onClick={() => dispatch({ type: 'clear' })}
            >
              {t.clear}
            </button>
          </div>
        </>
      )}
      {state.dialog === 'result' && state.result && (
        <>
          <div
            className="game-result-stars"
            aria-label={t.stars(state.result.stars)}
          >
            {'★'.repeat(state.result.stars)}
            <span>{'☆'.repeat(3 - state.result.stars)}</span>
          </div>
          <p className="game-dialog-intro">
            {t.resultNote(t.modelNames[state.levelId])}
          </p>
          <div className="game-result-stats">
            {[
              [formatTime(state.elapsed), t.resultTime],
              [state.bricks.length, t.resultPieces],
              [state.hints, t.resultHints],
            ].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="game-dialog-buttons">
            <button
              className="game-secondary"
              onClick={() =>
                dispatch({ type: 'start', levelId: state.levelId })
              }
            >
              {t.replay}
            </button>
            <button
              className="game-primary"
              onClick={() => dispatch({ type: 'next' })}
            >
              {state.levelId === LEVELS.at(-1).id ? t.collection : t.next}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
          <button
            className="game-text-button"
            onClick={() => dispatch({ type: 'collection' })}
          >
            {t.collection}
          </button>
        </>
      )}
      {state.notice && (
        <p className="game-inline-error" role="alert">
          {t.messages[state.notice.key]}
        </p>
      )}
      {storageFailed && (
        <p className="game-inline-error" role="status">
          {t.messages.storage}
        </p>
      )}
    </dialog>
  )
}
function BuildCode({ bricks, dispatch }) {
  const t = useT()
  const [code, setCode] = useState(() => encodeBuild(bricks))
  const [copied, setCopied] = useState(null)
  const ref = useRef(null)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      ref.current?.focus()
      ref.current?.select()
      setCopied(false)
    }
  }
  return (
    <>
      <p className="game-dialog-intro">{t.codeNote}</p>
      <textarea
        ref={ref}
        className="game-code"
        aria-label={t.buildCode}
        value={code}
        onChange={event => {
          setCode(event.target.value)
          setCopied(null)
        }}
        spellCheck={false}
        maxLength={200000}
      />
      {copied !== null && (
        <p role="status">{copied ? t.copiedCode : t.manualCode}</p>
      )}
      <div className="game-dialog-buttons">
        <button className="game-secondary" onClick={copy}>
          {t.copyCode}
          <Copy aria-hidden="true" />
        </button>
        <button
          className="game-primary"
          onClick={() => dispatch({ type: 'import', code })}
        >
          {t.importCode}
          <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </>
  )
}
