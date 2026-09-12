import { useEffect, useState } from 'react'
import { LocaleContext } from '../i18n/context'
import { readPreference, storePreference } from '../../shared/appearance.js'
import en from './i18n/en.js'
import sk from './i18n/sk.js'
export { useT, useLocale } from '../i18n/context'
const preferred = () => readPreference('locale', 'en') === 'sk' ? 'sk' : 'en'
export function LocaleProvider({ children, ssrLocale }) {
  const [locale, setLocale] = useState(() => ssrLocale || preferred())
  const [ready, setReady] = useState(!ssrLocale)
  const t = locale === 'sk' ? sk : en
  useEffect(() => { if (!ready) { setLocale(preferred()); setReady(true) } }, [ready])
  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = locale
    document.title = t.games.meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.games.meta.description)
    const url = new URL(location.href)
    url.searchParams.set('lang', locale)
    history.replaceState(null, '', url)
    storePreference('locale', locale)
  }, [locale, ready, t])
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
}
