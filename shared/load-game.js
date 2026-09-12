import './styles/desktop-game.css'

// Load the renderer lazily on every device and retain a lightweight error fallback.
export function loadGame({ title, locale, load }) {
  const sk = locale === 'sk'
  const notice = document.createElement('main')
  notice.className = 'desktop-game'
  notice.innerHTML = `<section class="desktop-game__card" aria-labelledby="desktop-game-title">
    <p class="desktop-game__eyebrow"></p>
    <h1 id="desktop-game-title">${sk ? 'Hra sa nenačítala' : 'The game could not load'}</h1>
    <p>${sk ? 'Obnovte stránku a skúste to znova.' : 'Refresh the page to try again.'}</p>
    <a href="/games/?lang=${sk ? 'sk' : 'en'}">${sk ? 'Späť na hry' : 'Back to games'} <span aria-hidden="true">↗</span></a>
  </section>`
  notice.querySelector('.desktop-game__eyebrow').textContent = title
  const canvas = document.querySelector('#game')
  let disposed = false
  canvas.hidden = false
  load().catch(error => {
    if (disposed) return
    console.error('Could not load game', error)
    canvas.hidden = true
    document.body.append(notice)
  })
  return () => { disposed = true; notice.remove() }
}
