import { useMemo, useRef, useState } from 'react'
import { Maximize, ArrowRight } from 'lucide-react'
import { useT } from '../i18n'
import { footprint, TYPES } from '../models.js'
import { isSandbox, levelFor } from '../state.js'
import useStudio from '../hooks/useStudio'
import Palette from './Palette'
import Toolbar from './Toolbar'
import Blueprint from './Blueprint'

export const formatTime = seconds =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

export default function Workspace({ state, dispatch, onReady }) {
  const t = useT()
  const mainRef = useRef(null),
    referenceRef = useRef(null)
  const level = levelFor(state),
    sandbox = isSandbox(state)
  const [expanded, setExpanded] = useState(false)
  const maxLayer = level
    ? Math.max(...level.bricks.map(brick => brick.y + footprint(brick).h))
    : 60
  const labels = useMemo(
    () => ({ workspace: t.workspace, reference: t.referenceLabel }),
    [t]
  )
  const { studio, error, retry, hover, progress } = useStudio({
    mainRef,
    referenceRef,
    state,
    dispatch,
    labels,
    onReady,
    paused: expanded,
  })
  const name = sandbox ? t.freeTitle : t.modelNames[state.levelId]
  const next = progress.missing[0]
  const nextType = next && TYPES.find(type => type.id === next.type)
  const step = next ? progress.missingIndices[0] + 1 : progress.total
  const pct = progress.total
    ? Math.round((progress.correct.size / progress.total) * 100)
    : 0

  return (
    <main className={`game-workspace${sandbox ? ' is-sandbox' : ''}`}>
      <div className="game-stage" ref={mainRef} />
      <div className="game-level-heading">
        <p className="game-eyebrow">
          {sandbox ? t.sandbox : t.difficulties[state.difficulty]}
        </p>
        <h1>{name}</h1>
        {!sandbox && (
          <span
            className="game-progress"
            role="progressbar"
            aria-label={name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            {pct}%
          </span>
        )}
      </div>
      <div className="game-guide-column">
        <Blueprint
          canvasRef={referenceRef}
          name={name}
          maxLayer={maxLayer}
          studio={studio}
          expanded={expanded}
          onExpand={setExpanded}
          hidden={sandbox}
        />
        <aside className="game-panel game-instruction">
          {!sandbox && (
            <>
              <p className="game-eyebrow">{t.booklet}</p>
              <h2>
                {state.difficulty === 'easy' && state.booklet
                  ? t.step(step, progress.total)
                  : t.progress(progress.correct.size, progress.total)}
              </h2>
            </>
          )}
          <p>
            {sandbox
              ? t.freeGuide
              : state.difficulty === 'easy' && state.booklet && next
                ? `${t.colours[next.color]} · ${nextType.w} × ${nextType.d}. ${t.follow}`
                : state.difficulty === 'hard'
                  ? t.hardGuide
                  : t.guide}
          </p>
          {!sandbox && <progress max="100" value={pct} aria-label={name} />}
          {!sandbox && state.difficulty === 'easy' && (
            <button onClick={() => dispatch({ type: 'booklet' })}>
              {state.booklet ? t.hideBooklet : t.showBooklet}
            </button>
          )}
        </aside>
      </div>
      <Palette state={state} dispatch={dispatch} />
      <div
        className="game-camera-tools"
        role="group"
        aria-label={t.views.frame}
      >
        {['front', 'side', 'top'].map(view => (
          <button
            className="game-icon-button"
            key={view}
            title={t.views[view]}
            aria-label={t.views[view]}
            onClick={() => studio?.view(view)}
          >
            {view[0].toUpperCase()}
          </button>
        ))}
        <button
          className="game-icon-button"
          title={t.views.frame}
          aria-label={t.views.frame}
          onClick={() => studio?.frame()}
        >
          <Maximize />
        </button>
      </div>
      {!state.bricks.length && sandbox && studio && (
        <p className="game-empty-note">{t.pickBrick}</p>
      )}
      <Toolbar state={state} dispatch={dispatch} />
      <footer className="game-workspace-foot">
        <span>
          {sandbox
            ? t.pieces(state.bricks.length)
            : state.compare
              ? t.comparison(
                  progress.correct.size,
                  state.bricks.length - progress.correct.size,
                  progress.missing.length
                )
              : t.progress(progress.correct.size, progress.total)}
        </span>
        <time>{formatTime(state.elapsed)}</time>
      </footer>
      {hover && !state.dialog && !expanded && (
        <div
          className="game-ghost-reason"
          style={{
            left: Math.max(8, Math.min(hover.x + 15, window.innerWidth - 240)),
            top: Math.min(hover.y + 20, window.innerHeight - 70),
          }}
        >
          {t.messages[hover.reason]}
        </div>
      )}
      {(!studio || error) && (
        <div className="game-scene-status" role="status">
          <h2>{error ? t.errorTitle : t.loading}</h2>
          {error && (
            <>
              <p>{t.error}</p>
              <button className="game-primary" onClick={retry}>
                {t.retry}
              </button>
            </>
          )}
        </div>
      )}
      {state.result && !state.dialog && (
        <div className="game-result-return">
          <button
            className="game-primary"
            onClick={() => dispatch({ type: 'next' })}
          >
            {t.next}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      )}
    </main>
  )
}
