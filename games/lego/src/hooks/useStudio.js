import { useEffect, useMemo, useRef, useState } from 'react'
import { levelFor, placementReason, progressFor } from '../state.js'
import { footprint } from '../bricks.js'

export default function useStudio({
  mainRef,
  referenceRef,
  state,
  dispatch,
  labels,
  onReady,
  paused = false,
}) {
  const latest = useRef({ state, labels, onReady, paused })
  latest.current = { state, labels, onReady, paused }
  const hoveredBrick = useRef(null)
  const [studio, setStudio] = useState(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [hover, setHover] = useState(null)
  const progress = useMemo(
    () => progressFor(state),
    [state.bricks, state.levelId]
  )

  useEffect(() => {
    let cancelled = false,
      instance = null
    setStudio(null)
    setError(false)
    latest.current.onReady(false)
    import('../scene/createStudio.js')
      .then(({ createStudio }) => {
        if (cancelled) return
        instance = createStudio({
          mainEl: mainRef.current,
          referenceEl: referenceRef.current,
          labels: latest.current.labels,
          getSelection: () => latest.current.state.selection,
          isPicking: () =>
            !latest.current.paused && latest.current.state.tool === 'pick',
          isRemoving: () => latest.current.state.tool === 'remove',
          isBuilding: () =>
            !latest.current.state.result &&
            !latest.current.state.dialog &&
            !latest.current.paused,
          onPlace: brick => dispatch({ type: 'place', brick }),
          onRemove: brick => dispatch({ type: 'remove', brick }),
          onPick: brick => dispatch({ type: 'select', selection: brick }),
          onHover: (candidate, brick, point) => {
            hoveredBrick.current = brick
            const current = latest.current.state
            const active =
              candidate &&
              current.tool === 'build' &&
              !current.result &&
              !current.dialog &&
              !latest.current.paused
            const reason = active ? placementReason(current, candidate) : ''
            instance?.setGhost(active ? candidate : null, !reason)
            setHover(reason && point ? { reason, ...point } : null)
          },
        })
        instance.frame(true)
        setStudio(instance)
        latest.current.onReady(!latest.current.paused)
      })
      .catch(error => {
        instance?.dispose()
        if (!cancelled) {
          console.error('Could not create brick studio', error)
          setError(true)
        }
      })
    return () => {
      cancelled = true
      instance?.dispose()
      latest.current.onReady(false)
    }
  }, [attempt, dispatch, mainRef, referenceRef])

  useEffect(() => {
    if (studio) onReady(!paused)
  }, [studio, paused, onReady])

  useEffect(() => {
    if (!studio) return
    const level = levelFor(state)
    studio.setTarget(level?.bricks || [])
    studio.setPeel(
      level
        ? Math.max(...level.bricks.map(brick => brick.y + footprint(brick).h))
        : 60
    )
  }, [studio, state.levelId])
  useEffect(() => {
    studio?.setBuild(state.bricks)
  }, [studio, state.bricks])
  useEffect(() => {
    if (!studio) return
    studio.setCompare(
      !state.result && state.compare && state.difficulty !== 'hard',
      progress.correct
    )
    studio.setMissing(
      !state.result && state.compare && state.difficulty !== 'hard'
        ? progress.missing
        : []
    )
    let guides = []
    if (!state.result && state.difficulty === 'easy') guides = progress.missing
    else if (
      !state.result &&
      state.difficulty === 'medium' &&
      progress.missing.length
    ) {
      const bottom = Math.min(...progress.missing.map(brick => brick.y))
      guides = progress.missing.filter(brick => brick.y === bottom)
    }
    studio.setGuides(guides)
    const hint =
      !state.result &&
      (state.hintBrick ||
        (state.difficulty === 'easy' && state.booklet && progress.missing[0]))
    studio.setHint(hint ? [hint] : [])
  }, [
    studio,
    progress,
    state.compare,
    state.difficulty,
    state.booklet,
    state.hintBrick,
    state.result,
  ])
  useEffect(() => {
    if (!studio) return
    studio.setGhost(null, true)
    setHover(null)
    studio.refreshHover()
  }, [studio, state.selection, state.tool, state.dialog, state.result, paused])
  useEffect(() => {
    if (state.result) studio?.celebrate()
  }, [studio, state.result])
  useEffect(() => {
    studio?.setLabels(labels)
  }, [studio, labels])

  useEffect(() => {
    const keydown = event => {
      const current = latest.current.state
      if (
        current.dialog ||
        latest.current.paused ||
        current.result ||
        event.target.closest?.('input,textarea,select,[contenteditable="true"]')
      )
        return
      const key = event.key.toLowerCase()
      if ((event.ctrlKey || event.metaKey) && ['z', 'y'].includes(key)) {
        event.preventDefault()
        dispatch({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const actions = {
        r: { type: 'rotate' },
        e: { type: 'tool', tool: 'pick' },
        q: { type: 'cycleColor', direction: -1 },
        w: { type: 'cycleColor', direction: 1 },
        '[': { type: 'cycleType', direction: -1 },
        ']': { type: 'cycleType', direction: 1 },
        delete: { type: 'remove', brick: hoveredBrick.current },
        backspace: { type: 'remove', brick: hoveredBrick.current },
        escape: { type: 'tool', tool: 'build' },
      }
      if (actions[key]) {
        event.preventDefault()
        dispatch(actions[key])
      } else if (/^[1-9]$/.test(key)) {
        event.preventDefault()
        dispatch({ type: 'cycleType', index: Number(key) - 1 })
      } else if (['f', 's', 't'].includes(key)) {
        event.preventDefault()
        studio?.view({ f: 'front', s: 'side', t: 'top' }[key])
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [studio, dispatch])
  return {
    studio,
    error,
    hover,
    progress,
    retry: () => setAttempt(value => value + 1),
  }
}
