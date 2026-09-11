// Shared palette for the portfolio and every game header.
export const ACCENTS = /** @type {const} */ ([
  { id: 'violet', color: '#9c6bff', sk: 'Fialová', en: 'Violet' },
  { id: 'cyan', color: '#45d8d0', sk: 'Tyrkysová', en: 'Cyan' },
  { id: 'lime', color: '#a6e34d', sk: 'Limetková', en: 'Lime' },
  { id: 'amber', color: '#f0b23c', sk: 'Jantárová', en: 'Amber' },
  { id: 'rose', color: '#ff6b9c', sk: 'Ružová', en: 'Rose' },
  { id: 'blue', color: '#6b8bff', sk: 'Modrá', en: 'Blue' },
])

export const ACCENT_IDS = ACCENTS.map((accent) => accent.id)

export function readPreference(key, fallback) {
  if (typeof window === 'undefined') return fallback
  const parameter = new URLSearchParams(window.location.search).get(
    key === 'locale' ? 'lang' : key,
  )
  if (parameter !== null) return parameter
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function storePreference(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* Session preferences still work. */
  }
  const url = new URL(location.href)
  const parameter = key === 'locale' ? 'lang' : key
  if (url.searchParams.has(parameter)) {
    url.searchParams.set(parameter, value)
    history.replaceState(null, '', url)
  }
}

export function isLightTheme() {
  return document.documentElement.dataset.theme === 'light'
}

export function updateThemeColor() {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      getComputedStyle(document.documentElement)
        .getPropertyValue('--bg')
        .trim(),
    )
}

export function initializeAppearance() {
  const root = document.documentElement
  root.dataset.theme =
    readPreference('theme', 'dark') === 'light' ? 'light' : 'dark'
  const accent = readPreference('accent', 'violet')
  root.dataset.accent = ACCENT_IDS.find((id) => id === accent) ?? 'violet'
  updateThemeColor()
}

export function siteLinks(locale) {
  return {
    home: locale === 'sk' ? '/sk/' : '/',
    games: `/games/?lang=${locale}`,
  }
}

export function readAccent() {
  try {
    const saved =
      localStorage.getItem('motion-accent') || localStorage.getItem('accent')
    return ACCENTS.find((item) => item.id === saved) || ACCENTS[0]
  } catch {
    return ACCENTS[0]
  }
}

/** Persist an explicit appearance choice and keep an existing URL override in sync. */
export function setAppearancePreference(key, value) {
  document.documentElement.dataset[key] = value
  storePreference(key, value)
  try {
    if (key === 'accent') localStorage.removeItem('motion-accent')
  } catch {
    /* The current page still reflects the choice. */
  }
  updateThemeColor()
}
