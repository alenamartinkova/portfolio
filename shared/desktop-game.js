import './styles/desktop-game.css'

// Keep this entry lightweight: unsupported devices must never download the
// renderer, physics WASM, or game assets. Recheck if the viewport/input changes.
export function desktopGame({ title, locale, load }) {
  const narrow = matchMedia('(max-width: 760px)')
  const touch = matchMedia('(pointer: coarse)')
  const fine = matchMedia('(any-pointer: fine)')
  const sk = locale === 'sk'
  const notice = document.createElement('main')
  notice.className = 'desktop-game'
  notice.innerHTML = `<section class="desktop-game__card" aria-labelledby="desktop-game-title">
    <p class="desktop-game__eyebrow"></p>
    <h1 id="desktop-game-title">${sk ? 'Zahrajte si na počítači' : 'Play on desktop'}</h1>
    <p>${sk ? 'Táto hra potrebuje klávesnicu, myš a väčšiu obrazovku. Otvorte tento odkaz na počítači. Na mobile si zatiaľ môžete zahrať Brick Break alebo Hexhaven.' : 'This game needs a keyboard, mouse and a larger screen. Open this link on your computer. You can play Brick Break or Hexhaven on mobile in the meantime.'}</p>
    <a href="/games/?lang=${sk ? 'sk' : 'en'}">${sk ? 'Späť na hry' : 'Back to games'} <span aria-hidden="true">↗</span></a>
  </section>`
  notice.querySelector('.desktop-game__eyebrow').textContent = title
  const canvas = document.querySelector('#game')
  let started = false
  let disposed = false
  const stopWatching = () => {
    for (const query of [narrow, touch, fine]) query.removeEventListener('change', check)
  }
  function check() {
    if (disposed || started) return
    if (narrow.matches || (touch.matches && !fine.matches)) {
      canvas.hidden = true
      document.body.append(notice)
      return
    }
    started = true
    stopWatching()
    notice.remove()
    canvas.hidden = false
    load().catch(error => {
      if (disposed) return
      console.error('Could not load game', error)
      canvas.hidden = true
      notice.querySelector('h1').textContent = sk ? 'Hra sa nenačítala' : 'The game could not load'
      notice.querySelector('.desktop-game__card > p:not([class])').textContent = sk
        ? 'Obnovte stránku a skúste to znova.' : 'Refresh the page to try again.'
      document.body.append(notice)
    })
  }
  for (const query of [narrow, touch, fine]) query.addEventListener('change', check)
  check()
  return () => { disposed = true; stopWatching(); notice.remove() }
}
