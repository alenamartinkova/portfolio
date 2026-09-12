import { Component, lazy, Suspense, useEffect, useState } from 'react'
import { GameLocaleProvider, useT } from './i18n'
import useGame from './hooks/useGame'
import useAudio from './hooks/useAudio'
import GameHeader from './components/GameHeader'
import Collection from './components/Collection'
import GameDialog from './components/GameDialog'
import './Game.css'
import { loadStudio } from './loadStudio.js'
import { mountFpsMeter } from '../../../shared/fps-meter.js'

const Workspace = lazy(() => Promise.all([import('./components/Workspace'), loadStudio()]).then(([workspace]) => workspace))

class WorkspaceBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    console.error('Brick workspace failed', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
function Game() {
  useEffect(mountFpsMeter, [])
  const t = useT()
  const [ready, setReady] = useState(false)
  const { state, dispatch, storageFailed } = useGame(ready)
  useAudio(state.saved.muted, state.sound, state.revision)
  useEffect(() => {
    const help = event => {
      if (
        !state.dialog &&
        !event.target.closest?.('.game-reference.is-expanded') &&
        !event.target.closest?.(
          'input,textarea,select,[contenteditable="true"]'
        ) &&
        ['?', 'F1'].includes(event.key)
      ) {
        event.preventDefault()
        dispatch({ type: 'dialog', dialog: 'help' })
      }
    }
    window.addEventListener('keydown', help)
    return () => window.removeEventListener('keydown', help)
  }, [state.dialog, dispatch])
  return (
    <div className="game-app">
      <GameHeader state={state} dispatch={dispatch} />
      {state.screen === 'collection' ? (
        <Collection state={state} dispatch={dispatch} />
      ) : (
        <WorkspaceBoundary
          key={state.session}
          fallback={
            <main className="game-load-failure">
              <h1>{t.errorTitle}</h1>
              <p>{t.error}</p>
              <button
                className="game-primary"
                onClick={() => location.reload()}
              >
                {t.retry}
              </button>
            </main>
          }
        >
          <Suspense
            fallback={
              <main className="game-loading" role="status">
                {t.loading}
              </main>
            }
          >
            <Workspace state={state} dispatch={dispatch} onReady={setReady} />
          </Suspense>
        </WorkspaceBoundary>
      )}
      {state.dialog && (
        <GameDialog
          key={state.dialog}
          state={state}
          dispatch={dispatch}
          storageFailed={storageFailed}
        />
      )}
      {!state.dialog && (state.notice || storageFailed) && (
        <div className="game-notice" role="status">
          {state.notice ? t.messages[state.notice.key] : t.messages.storage}
        </div>
      )}
    </div>
  )
}
export default function GameApp() {
  return (
    <GameLocaleProvider>
      <Game />
    </GameLocaleProvider>
  )
}
