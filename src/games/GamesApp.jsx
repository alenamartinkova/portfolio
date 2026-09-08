import { ArrowLeft, ArrowUpRight, Gamepad2 } from 'lucide-react'
import { LocaleProvider, useLocale, useT } from '../i18n'
import LocaleToggle from '../components/LocaleToggle'
import ThemeToggle from '../components/ThemeToggle'
import Customizer from '../components/Customizer'
import { GAMES } from './catalog'
import '../App.css'
import './Games.css'

function GamesPage() {
  const t = useT()
  const [locale] = useLocale()
  const home = locale === 'sk' ? '/sk/' : '/'

  return (
    <div className="games-page">
      <a className="skip-link" href="#main">{t.nav.skip}</a>
      <header className="games-nav shell">
        <a className="games-nav__home" href={home} aria-label={t.games.back}>
          <ArrowLeft aria-hidden="true" />
          <span><span className="games-nav__bracket">[</span>AM<span className="games-nav__bracket">]</span></span>
          <span className="games-nav__label">{t.games.back}</span>
        </a>
        <div className="games-nav__actions">
          <LocaleToggle />
          <ThemeToggle />
          <Customizer />
        </div>
      </header>

      <main className="games-main shell" id="main">
        <div className="games-intro">
          <p className="games-eyebrow">
            <Gamepad2 aria-hidden="true" />
            {t.games.eyebrow}
          </p>
          <h1>Games<span>.</span></h1>
          <p className="games-intro__copy">{t.games.intro}</p>
        </div>

        <ul className="games-list" aria-label={t.games.list}>
          {GAMES.map(game => {
            const copy = t.games[game.id]
            const Icon = game.icon
            return (
              <li key={game.id}>
                <a
                  className="games-card"
                  href={`${game.href}?lang=${locale}`}
                  aria-labelledby={`${game.id}-title ${game.id}-play`}
                  aria-describedby={`${game.id}-description`}
                >
                  <div className="games-card__art" aria-hidden="true">
                    <span className="games-card__orbit" />
                    <Icon />
                    <span className="games-card__art-label">{copy.caption}</span>
                  </div>
                  <div className="games-card__body">
                    <span className="games-card__category">{copy.category}</span>
                    <h2 id={`${game.id}-title`}>{game.title}</h2>
                    <p id={`${game.id}-description`}>{copy.description}</p>
                    <span className="games-card__play" id={`${game.id}-play`}>
                      {t.games.play}<ArrowUpRight aria-hidden="true" />
                    </span>
                  </div>
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
