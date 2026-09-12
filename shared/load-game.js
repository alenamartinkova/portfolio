import './styles/desktop-game.css'
import { mountFpsMeter } from './fps-meter.js'

/** Yield startup work so the browser can paint the shell and process input. */
export const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0))
export const afterPaint = () => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)))

/** A loader owns the application lifetime, including an import that finishes late. */
export function loadGame({ title, locale, load }) {
  const disposeFps = mountFpsMeter()
  const sk = locale === 'sk'
  const notice = document.createElement('main')
  notice.className = 'desktop-game'
  notice.setAttribute('aria-busy', 'true')
  notice.innerHTML = `<section class="desktop-game__card" aria-labelledby="desktop-game-title">
    <h1 id="desktop-game-title"></h1>
    <p role="status">${sk ? 'Načítavam hru…' : 'Loading game…'}</p>
    <a href="/games/?lang=${sk ? 'sk' : 'en'}">${sk ? 'Späť na hry' : 'Back to games'} ↗</a>
  </section>`
  notice.querySelector('h1').textContent = title
  document.body.append(notice)
  let disposed = false
  let cleanup
  void afterPaint().then(async () => {
    if (disposed) return
    cleanup = await load()
    if (disposed && typeof cleanup === 'function') cleanup()
    notice.remove()
  }).catch(error => {
    if (disposed) return
    console.error('Could not load game', error)
    notice.setAttribute('aria-busy', 'false')
    notice.querySelector('[role="status"]').textContent = sk
      ? 'Hra sa nenačítala. Obnovte stránku a skúste to znova.'
      : 'The game could not load. Refresh the page to try again.'
  })
  function dispose() {
    if (disposed) return
    disposed = true
    disposeFps()
    if (typeof cleanup === 'function') cleanup()
    notice.remove()
    window.removeEventListener('pagehide', pagehide)
  }
  function pagehide(event) { if (!event.persisted) dispose() }
  window.addEventListener('pagehide', pagehide)
  return dispose
}
