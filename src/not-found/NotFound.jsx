import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { LocaleContext } from '../i18n/context'
import en from '../i18n/en'
import sk from '../i18n/sk'
import ThemeToggle from '../components/ThemeToggle'
import ColorPicker, { readAccent } from '../motion/ColorPicker'
import { setAppearancePreference } from '../../shared/appearance.js'
import { NOT_FOUND_COPY } from './copy'
import '../../shared/styles/appearance-controls.css'
import './not-found.css'

export default function NotFound({ ssrLocale }) {
  const [locale, setLocale] = useState(() => ssrLocale || (
    typeof window !== 'undefined' && /^\/sk(?:\/|$)/.test(window.location.pathname) ? 'sk' : 'en'
  ))
  const [accent, setAccent] = useState(readAccent)
  const t = locale === 'sk' ? sk : en
  const copy = NOT_FOUND_COPY[locale]
  const home = locale === 'sk' ? '/sk/' : '/'
  const nextLocale = locale === 'sk' ? 'en' : 'sk'

  useEffect(() => {
    document.title = copy.title
    document.documentElement.lang = locale
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description)
    // The dev server can serve the portfolio shell for an unknown URL.
    // Keep its canonical/profile metadata from describing an error page.
    document.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[type="application/ld+json"], meta[property^="og:"], meta[name^="twitter:"]').forEach(node => node.remove())
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.append(robots)
    }
    robots.content = 'noindex, follow'
  }, [copy, locale])

  return <LocaleContext.Provider value={{ locale, t, setLocale }}>
    <div className="not-found">
      <a className="nf-skip" href="#content">{t.nav.skip}</a>
      <header className="nf-header">
        <a className="nf-brand" href={home} aria-label="Alena Martinková">am<span>.</span></a>
        <div className="appearance-controls">
          <ThemeToggle />
          <ColorPicker accent={accent} locale={locale} onChange={value => {
            setAccent(value)
            setAppearancePreference('accent', value.id)
          }} />
          <button className="m-locale" type="button" lang={nextLocale}
            aria-label={nextLocale === 'sk' ? 'Prepnúť do slovenčiny' : 'Switch to English'}
            onClick={() => setLocale(nextLocale)}>{nextLocale.toUpperCase()}</button>
        </div>
      </header>

      <main className="nf-main" id="content" tabIndex={-1}>
        <div className="nf-art" aria-hidden="true">
          <div className="nf-coordinate nf-coordinate--top">HTTP / 404</div>
          <div className="nf-digits"><span>4</span><span className="nf-zero">0<span className="nf-orbit" /></span><span>4</span></div>
          <div className="nf-coordinate nf-coordinate--bottom"><span /> ROUTE NOT FOUND</div>
        </div>
        <section className="nf-copy" aria-labelledby="nf-title">
          <p className="nf-eyebrow"><span>404</span> / {copy.label}</p>
          <h1 id="nf-title">{copy.heading}</h1>
          <p className="nf-description">{copy.description}</p>
          <div className="nf-actions">
            <a className="nf-home" href={home}><ArrowLeft size={18} aria-hidden="true" />{copy.home}</a>
            <a className="nf-work" href={`${home}#work`}>{copy.work}<ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </section>
      </main>

      <footer className="nf-footer">
        <span>{copy.note}</span>
        <a href={`${home}#contact`}>{copy.contact}<ArrowUpRight size={15} aria-hidden="true" /></a>
      </footer>
    </div>
  </LocaleContext.Provider>
}
