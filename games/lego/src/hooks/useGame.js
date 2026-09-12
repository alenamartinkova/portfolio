import { useEffect, useReducer, useRef, useState } from 'react'
import { gameReducer, initializeGame } from '../state.js'
import { readSaved, savedFromState, writeSaved } from '../persistence.js'

function load() {
  try {
    return readSaved(localStorage)
  } catch {
    return null
  }
}
export default function useGame(clockEnabled) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    initializeGame(load(), new URLSearchParams(location.search).get('mode'))
  )
  const current = useRef(state)
  current.current = state
  const [storageFailed, setStorageFailed] = useState(false)
  useEffect(() => {
    let ok = false
    try {
      ok = writeSaved(localStorage, savedFromState(current.current))
    } catch {
      /* Storage disabled. */
    }
    setStorageFailed(!ok)
  }, [state.bricks, state.saved, state.difficulty, state.result, state.levelId])
  useEffect(() => {
    const save = () => {
      try {
        writeSaved(localStorage, savedFromState(current.current))
      } catch {
        /* Export remains available. */
      }
    }
    const hidden = () => {
      if (document.hidden) save()
    }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [])
  useEffect(() => {
    if (
      !clockEnabled ||
      state.screen !== 'build' ||
      state.dialog ||
      state.result
    )
      return
    let timer
    const syncClock = () => {
      clearInterval(timer)
      if (document.hidden) return
      let previous = performance.now()
      timer = setInterval(() => {
        const now = performance.now()
        dispatch({ type: 'tick', seconds: (now - previous) / 1000 })
        previous = now
      }, 500)
    }
    document.addEventListener('visibilitychange', syncClock)
    syncClock()
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', syncClock)
    }
  }, [clockEnabled, state.screen, state.dialog, state.result])
  useEffect(() => {
    if (!state.hintBrick) return
    const timer = setTimeout(() => dispatch({ type: 'clearHint' }), 3000)
    return () => clearTimeout(timer)
  }, [state.hintBrick])
  useEffect(() => {
    if (!state.notice) return
    const timer = setTimeout(() => dispatch({ type: 'dismissNotice' }), 4500)
    return () => clearTimeout(timer)
  }, [state.notice])
  return { state, dispatch, storageFailed }
}
