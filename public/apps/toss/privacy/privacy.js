// Only the first-party display preference; no analytics or network requests.
const toggle = document.querySelector('.theme-toggle')
const root = document.documentElement
const sk = root.lang === 'sk'
function updateLabel() {
  const light = root.dataset.theme === 'light'
  toggle.setAttribute('aria-label', sk
    ? (light ? 'Prepnúť na tmavú tému' : 'Prepnúť na svetlú tému')
    : (light ? 'Switch to dark theme' : 'Switch to light theme'))
  document.querySelector('meta[name="theme-color"]').content = light ? '#f2f2f7' : '#101018'
}
if (toggle) {
  toggle.hidden = false
  updateLabel()
  toggle.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light'
    root.dataset.theme = light ? 'light' : 'dark'
    try { localStorage.setItem('theme', light ? 'light' : 'dark') } catch { /* Works without storage. */ }
    updateLabel()
  })
}
