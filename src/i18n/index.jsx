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

function initialLocale() {
  // English is the default for everyone; only an explicit choice changes it.
  // Browser-language detection would otherwise flip Slovak visitors away from
  // the version most recruiters land on.
  if (typeof localStorage === 'undefined') return 'en'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DICTIONARIES[stored]) return stored
  } catch {
    // storage unavailable
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
