import { ACCENTS, isLightTheme, setAppearancePreference } from './appearance.js'

const icon = (paths, className = '') =>
  `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
const sun =
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>'
const moon =
  '<path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.464.402.807a6.25 6.25 0 0 0 8.268 8.268c.344-.215.83-.004.803.397"/>'
const palette =
  '<path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 1.06-2.56 1.5 1.5 0 0 1 1.06-2.56H17A4 4 0 0 0 21 12a9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="10" r=".5"/><circle cx="10" cy="6.5" r=".5"/><circle cx="14" cy="6.5" r=".5"/><circle cx="16.5" cy="10" r=".5"/>'
const check = icon('<path d="m9 12 2 2 4-4"/>')

/** Portfolio-style controls without a React dependency in the canvas games.
 * @param {HTMLElement} root
 * @param {{locale: 'en' | 'sk', onLocaleChange: (locale: 'en' | 'sk') => void}} options
 */
export function mountGameAppearance(root, { locale, onLocaleChange }) {
  const sk = locale === 'sk'
  const next = sk ? 'en' : 'sk'
  const colorLabel = sk ? 'Farba stránky' : 'Accent color'
  const languageLabel =
    next === 'en' ? 'Switch to English' : 'Prepnúť do slovenčiny'
  root.classList.add('appearance-controls')
  const swatches = ACCENTS.map(
    (item) => `
    <button type="button" style="--swatch:${item.color}"
      data-accent="${item.id}" data-focus="site-color-${item.id}"
      aria-label="${item[locale]}" title="${item[locale]}" aria-pressed="false"></button>
  `,
  ).join('')
  root.innerHTML = `
    <button type="button" class="theme-toggle" data-focus="site-theme">
      <span class="theme-toggle__icons">
        ${icon(sun, 'theme-toggle__icon theme-toggle__icon--sun')}
        ${icon(moon, 'theme-toggle__icon theme-toggle__icon--moon')}
      </span>
    </button>
    <div class="m-color-picker">
      <button type="button" class="m-color-trigger" data-focus="site-color"
        aria-label="${colorLabel}" title="${colorLabel}"
        aria-expanded="false" aria-controls="game-colors">${icon(palette)}</button>
      <fieldset class="m-color-panel" id="game-colors" hidden>
        <legend class="game-nav__sr">${colorLabel}</legend>
        <p aria-hidden="true">${colorLabel}</p>
        <div>${swatches}</div>
      </fieldset>
    </div>
    <a class="m-locale" data-focus="site-language" lang="${next}" hreflang="${next}"
      aria-label="${languageLabel}" title="${languageLabel}">${next.toUpperCase()}</a>
  `
  const theme = root.querySelector('.theme-toggle')
  const trigger = root.querySelector('.m-color-trigger')
  const picker = root.querySelector('.m-color-picker')
  const panel = root.querySelector('.m-color-panel')
  const language = root.querySelector('.m-locale')
  const accentButtons = root.querySelectorAll('[data-accent]')
  const refresh = () => {
    const languageUrl = new URL(location.href)
    languageUrl.searchParams.set('lang', next)
    language.href = languageUrl.href
    const light = isLightTheme()
    const label = sk
      ? `Prepnúť na ${light ? 'tmavý' : 'svetlý'} režim`
      : `Switch to ${light ? 'dark' : 'light'} theme`
    theme.setAttribute('aria-label', label)
    theme.setAttribute('title', label)
    accentButtons.forEach((button) => {
      const selected =
        button.dataset.accent ===
        (document.documentElement.dataset.accent || 'violet')
      button.setAttribute('aria-pressed', String(selected))
      button.innerHTML = selected ? check : ''
    })
  }
  const setPaletteOpen = (open) => {
    panel.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
  }
  const close = () => setPaletteOpen(false)
  const outside = (event) => {
    if (!picker.contains(event.target)) close()
  }
  const blur = (event) => {
    if (!picker.contains(event.relatedTarget)) close()
  }
  const keyboard = (event) => {
    // Header controls must not move the player or trigger game shortcuts.
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault()
      close()
      trigger.focus()
    }
    event.stopPropagation()
  }
  theme.onclick = () =>
    setAppearancePreference('theme', isLightTheme() ? 'dark' : 'light')
  trigger.onclick = () => setPaletteOpen(panel.hidden)
  accentButtons.forEach((button) => {
    button.onclick = () =>
      setAppearancePreference('accent', button.dataset.accent)
  })
  language.onclick = (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    const url = new URL(location.href)
    url.searchParams.set('lang', next)
    history.replaceState(null, '', url)
    onLocaleChange(next)
  }
  // Theme/accent changes from game settings use the same document attributes.
  const observer = new MutationObserver(refresh)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-accent'],
  })
  document.addEventListener('pointerdown', outside)
  picker.addEventListener('focusout', blur)
  root.addEventListener('keydown', keyboard)
  refresh()
  return () => {
    observer.disconnect()
    document.removeEventListener('pointerdown', outside)
    picker.removeEventListener('focusout', blur)
    root.removeEventListener('keydown', keyboard)
    theme.onclick = null
    trigger.onclick = null
    language.onclick = null
    accentButtons.forEach((button) => {
      button.onclick = null
    })
  }
}
