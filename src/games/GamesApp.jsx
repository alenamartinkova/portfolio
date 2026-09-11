import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Gamepad2 } from 'lucide-react'
import { LocaleProvider, useLocale, useT } from '../i18n'
import LanguageLink from '../components/LanguageLink'
import ThemeToggle from '../components/ThemeToggle'
import '../../shared/styles/appearance-controls.css'
import { setAppearancePreference } from '../../shared/appearance.js'
import ColorPicker, { readAccent } from '../motion/ColorPicker'
import useMotion from '../motion/useMotion'
import { GAMES } from './catalog'
import './Games.css'

function GamesPage() {
  const t = useT()
  const [locale, setLocale] = useLocale()
  const home = locale === 'sk' ? '/sk/' : '/'
  const [accent, setAccent] = useState(readAccent)
  const root = useRef(null)
  const [motion, setMotion] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useMotion(root, motion, locale)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setMotion(!media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    setAppearancePreference('accent', accent.id)
  }, [accent])

  return (
    <div className="games-page" data-motion={motion ? 'on' : 'off'} ref={root}>
      <a className="skip-link" href="#main">{t.nav.skip}</a>
      <header className="games-nav shell">
        <a className="games-nav__home" href={home} aria-label={t.games.back}>
          <span className="games-brand">am<span>.</span></span>
          <span className="games-nav__label"><ArrowLeft aria-hidden="true" />{t.games.back}</span>
        </a>
        <div className="games-nav__actions appearance-controls">
          <ThemeToggle />
          <ColorPicker accent={accent} onChange={setAccent} locale={locale} />
          <LanguageLink locale={locale} onChange={setLocale} page="games" />
        </div>
      </header>

      <main className="games-main shell" id="main">
        <div className="games-intro">
          <p className="games-eyebrow">
            <Gamepad2 aria-hidden="true" />
            {t.games.eyebrow}
          </p>
          <h1>{t.games.heading}<span>.</span></h1>
          <p className="games-intro__copy">{t.games.intro}</p>
        </div>

        <ul className="games-list" data-stack-end aria-label={t.games.list}>
          {GAMES.map((game, index) => {
            const copy = t.games[game.id]
            const Icon = game.icon
            return (
              <li key={game.id} data-project data-motion-item>
                <a
                  className="games-card"
                  href={`${game.href}?lang=${locale}`}
                  aria-labelledby={`${game.id}-title ${game.id}-play`}
                  aria-describedby={`${game.id}-description${game.desktopOnly ? ` ${game.id}-device` : ''}`}
                >
                  <div className="games-card__top">
                    <span className="games-card__category"><Icon aria-hidden="true" /><span className="games-card__number">0{index + 1} /</span>{copy.category}</span>
                    <span className="games-card__caption">{copy.caption}</span>
                  </div>
                  <div className="games-card__body">
                    <h2 id={`${game.id}-title`}>{game.title}<span aria-hidden="true">.</span></h2>
                  </div>
                  <div className="games-card__bottom">
                    <div className="games-card__details">
                      <p id={`${game.id}-description`}>{copy.description}</p>
                      {game.desktopOnly && <span className="games-card__device" id={`${game.id}-device`}>{t.games.desktopOnly}</span>}
                    </div>
                    <span className="games-card__play" id={`${game.id}-play`}>
                      {t.games.play}<ArrowUpRight aria-hidden="true" />
                    </span>
                  </div>
                  <span className="games-card__watermark" aria-hidden="true">0{index + 1}</span>
                </a>
              </li>
            )
          })}
        </ul>
        <p className="games-more"><span aria-hidden="true">//</span> {t.games.more}</p>
      </main>

      <footer className="games-footer shell">
        <span>© {new Date().getFullYear()} Alena Martinková</span>
        <a href={home}>{t.games.back}<ArrowUpRight aria-hidden="true" /></a>
      </footer>
    </div>
  )
}

export default function GamesApp({ ssrLocale }) {
  return (
    <LocaleProvider page="games" ssrLocale={ssrLocale}>
      <GamesPage />
    </LocaleProvider>
  )
}
