import { createContext, useContext, useEffect, useState } from 'react'
import en from './en'
import sk from './sk'
import { localizeStructuredData, portfolioUrl } from '../seo'

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

function initialLocale(page) {
  // Each language lives on its own URL (/ and /sk/) so both are crawlable;
  // the path always wins, including English at /. Stored choices apply only
  // to games and legacy entry points, keeping rendered and static HTML aligned.
  if (typeof window === 'undefined') return 'en'
  if (page === 'games' || window.location.pathname.startsWith('/motion')) {
    const lang = new URLSearchParams(window.location.search).get('lang')
    if (lang === 'en' || lang === 'sk') return lang
  }
  const fromPath = localeFromPath(window.location.pathname)
  if (fromPath) return fromPath
  if (page === 'portfolio' && ['/', '/index.html'].includes(window.location.pathname)) return 'en'
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && DICTIONARIES[stored]) return stored
  } catch {
    // storage unavailable
  }
  return 'en'
}

export function LocaleProvider({ children, ssrLocale, page = 'portfolio' }) {
  const [locale, setLocale] = useState(() => ssrLocale || initialLocale(page))
  const t = DICTIONARIES[locale] || en
  const meta = page === 'games' ? t.games.meta : t.meta

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = meta.title

    const description = document.querySelector('meta[name="description"]')
    if (description) description.setAttribute('content', meta.description)
    if (page === 'portfolio') {
      const canonical = portfolioUrl(locale)
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical)
      for (const [selector, value] of [
        ['meta[property="og:url"]', canonical],
        ['meta[property="og:title"]', meta.title],
        ['meta[property="og:description"]', meta.description],
        ['meta[property="og:locale"]', locale === 'sk' ? 'sk_SK' : 'en_US'],
        ['meta[property="og:locale:alternate"]', locale === 'sk' ? 'en_US' : 'sk_SK'],
        ['meta[name="twitter:title"]', meta.title],
        ['meta[name="twitter:description"]', meta.description],
      ]) document.querySelector(selector)?.setAttribute('content', value)
      const structuredData = document.querySelector('script[type="application/ld+json"]')
      if (structuredData) {
        structuredData.textContent = JSON.stringify(localizeStructuredData(JSON.parse(structuredData.textContent), locale, meta))
      }
      const oldAnchors = { skills: 'stack', projects: 'work', journey: 'career' }
      const legacy = oldAnchors[window.location.hash.slice(1)]
      if (legacy) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + `#${legacy}`)
        document.getElementById(legacy)?.scrollIntoView({ behavior: 'instant' })
      }
    }

    // Keep the URL in step with the language so reloads and shared links stay
    // in the visitor's locale. replaceState: switching language is not a
    // navigation, so it should not grow history.
    if (page === 'games') {
      const url = new URL(window.location.href)
      url.pathname = '/games/'
      url.searchParams.set('lang', locale)
      window.history.replaceState(null, '', url)
    } else {
      const path = locale === 'en' ? '/' : `/${locale}/`
      if (window.location.pathname !== path) {
        window.history.replaceState(null, '', path + window.location.hash)
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Non-persistent choice is still better than none.
    }
  }, [locale, meta, page])

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
