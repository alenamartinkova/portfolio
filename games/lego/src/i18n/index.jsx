import { createContext, useContext, useEffect, useState } from 'react'
import en from './en.js'
import sk from './sk.js'

const dictionaries = { en, sk }
const GameLocaleContext = createContext({
  locale: 'en',
  t: en,
  setLocale: () => {},
})
export function readPreference(key, fallback) {
  if (typeof window === 'undefined') return fallback
  const value = new URLSearchParams(window.location.search).get(
    key === 'locale' ? 'lang' : key
  )
  if (value !== null) return value
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

// Keep the game dictionaries out of the portfolio bundle. Like the main site's
// provider, this exposes useT/useLocale; URL changes stay on the game's route.
export function GameLocaleProvider({ children, initialLocale }) {
  const [locale, setLocale] = useState(
    () =>
      initialLocale || (readPreference('locale', 'en') === 'sk' ? 'sk' : 'en')
  )
  const t = dictionaries[locale] || en
  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    document.title = t.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.description)
    root.dataset.theme =
      readPreference('theme', 'dark') === 'light' ? 'light' : 'dark'
    const accent = readPreference('accent', '')
    if (['cyan', 'lime', 'amber', 'rose', 'blue'].includes(accent))
      root.dataset.accent = accent
    const url = new URL(location.href)
    url.searchParams.set('lang', locale)
    history.replaceState(null, '', url)
    try {
      localStorage.setItem('locale', locale)
    } catch {
      /* Session-only locale. */
    }
  }, [locale, t])
  return (
    <GameLocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </GameLocaleContext.Provider>
  )
}
export const useT = () => useContext(GameLocaleContext).t
export function useLocale() {
  const { locale, setLocale } = useContext(GameLocaleContext)
  return [locale, setLocale]
}
