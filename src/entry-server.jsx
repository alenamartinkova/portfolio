import { renderToString } from 'react-dom/server'
import App from './App'
import en from './i18n/en'
import sk from './i18n/sk'

/**
 * Used only by scripts/prerender.mjs at build time. The output is markup for
 * crawlers; the browser still boots the full app on top of it. Each locale is
 * rendered separately and written to its own URL (/ and /sk/).
 */
export function render(locale = 'en') {
  return renderToString(<App ssrLocale={locale} />)
}

/** Title and description for a locale, for the prerender's meta rewriting. */
export function metaFor(locale) {
  return (locale === 'sk' ? sk : en).meta
}
