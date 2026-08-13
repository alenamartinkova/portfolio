import { createContext, useContext, useEffect, useState } from 'react'
import en from './en'
import sk from './sk'

export const LOCALES = [
  { id: 'en', label: 'EN' },
  { id: 'sk', label: 'SK' },
]

const DICTIONARIES = { en, sk }

// Czech is mutually intelligible with Slovak, so cs browsers get sk rather
// than falling back to English.
const ALIASES = { cs: 'sk' }
const STORAGE_KEY = 'locale'

const LocaleContext = createContext({ locale: 'en', t: en, setLocale: () => {} })

function initialLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DICTIONARIES[stored]) return stored
  } catch {
    // storage unavailable — fall through to detection
  }

  // Czech and Slovak visitors get their own language; everyone else English.
  const preferred = navigator.languages || [navigator.language || 'en']
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0]
    const resolved = ALIASES[base] || base
    if (DICTIONARIES[resolved]) return resolved
  }
  return 'en'
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(initialLocale)
  const t = DICTIONARIES[locale] || en

  useEffect(() => {
    document.documentElement.lang = t.meta.lang
    document.title = t.meta.title

    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', t.meta.description)

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
