import { createContext, useContext, useEffect, useState } from 'react'
import en from './en'
import sk from './sk'

export const LOCALES = [
  { id: 'en', label: 'EN' },
  { id: 'sk', label: 'SK' },
]

const DICTIONARIES = { en, sk }

const STORAGE_KEY = 'locale'

const LocaleContext = createContext({ locale: 'en', t: en, setLocale: () => {} })

/** '/sk/' (any depth) → 'sk', everything else → null. */
function localeFromPath(pathname) {
  const first = pathname.split('/').filter(Boolean)[0]
  return first && DICTIONARIES[first] ? first : null
}

function initialLocale() {
  // Each language lives on its own URL (/ and /sk/) so both are crawlable;
  // the path always wins. On the root URL a stored explicit choice applies —
  // browser-language detection would otherwise flip Slovak visitors away from
  // the version most recruiters land on.
  if (typeof window === 'undefined') return 'en'
  const fromPath = localeFromPath(window.location.pathname)
  if (fromPath) return fromPath
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DICTIONARIES[stored]) return stored
  } catch {
    // storage unavailable
  }
  return 'en'
}

export function LocaleProvider({ children, ssrLocale }) {
  const [locale, setLocale] = useState(ssrLocale || initialLocale)
  const t = DICTIONARIES[locale] || en

  useEffect(() => {
    document.documentElement.lang = t.meta.lang
    document.title = t.meta.title

    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', t.meta.description)

    // Keep the URL in step with the language so reloads and shared links stay
    // in the visitor's locale. replaceState: switching language is not a
    // navigation, so it should not grow history.
    const path = locale === 'en' ? '/' : `/${locale}/`
    if (window.location.pathname !== path) {
      window.history.replaceState(null, '', path + window.location.hash)
    }

    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Non-persistent choice is still better than none.
    }
  }, [locale, t])

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

/** The dictionary for the active locale. */
export function useT() {
  return useContext(LocaleContext).t
}

/** [locale, setLocale] for the language switcher. */
export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext)
  return [locale, setLocale]
}
