import { createContext, useContext, useEffect, useState } from 'react'
import {
  readPreference,
  initializeAppearance,
  storePreference,
} from '../../../../shared/appearance.js'
import en from './en.js'
import sk from './sk.js'

const dictionaries = { en, sk }
const GameLocaleContext = createContext({
  locale: 'en',
  t: en,
  setLocale: () => {},
})
// Keep the game dictionaries out of the portfolio bundle. Like the main site's
// provider, this exposes useT/useLocale; URL changes stay on the game's route.
export function GameLocaleProvider({ children, initialLocale }) {
  const [locale, setLocale] = useState(
    () =>
      initialLocale || (readPreference('locale', 'en') === 'sk' ? 'sk' : 'en'),
  )
  const t = dictionaries[locale] || en
  useEffect(() => {
    const root = document.documentElement
    root.lang = locale
    document.title = t.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.description)
    initializeAppearance()
    const url = new URL(location.href)
    url.searchParams.set('lang', locale)
    history.replaceState(null, '', url)
    storePreference('locale', locale)
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
