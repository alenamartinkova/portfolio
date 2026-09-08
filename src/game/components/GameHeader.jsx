import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  HelpCircle,
  Moon,
  Settings,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { readPreference, useLocale, useT } from '../i18n'
import '../../components/LocaleToggle.css'

function useGameTheme() {
  const [theme, setTheme] = useState(() =>
    readPreference('theme', 'dark') === 'light' ? 'light' : 'dark'
  )
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const url = new URL(window.location.href)
    if (url.searchParams.has('theme')) {
      url.searchParams.set('theme', theme)
      window.history.replaceState(null, '', url)
    }
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Theme still applies for this session when storage is unavailable.
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        getComputedStyle(root).getPropertyValue('--bg').trim()
      )
  }, [theme])
  return [
    theme,
    () => setTheme(current => (current === 'light' ? 'dark' : 'light')),
  ]
}

export default function GameHeader({ state, dispatch }) {
  const t = useT()
  const [locale, setLocale] = useLocale()
  const [theme, toggleTheme] = useGameTheme()
  const themeLabel =
    locale === 'sk'
      ? theme === 'light'
        ? 'Prepnúť na tmavý režim'
        : 'Prepnúť na svetlý režim'
      : theme === 'light'
        ? 'Switch to dark theme'
        : 'Switch to light theme'
  const [share, setShare] = useState(null)
  const input = useRef(null)
  useEffect(() => {
    if (share?.url) {
      input.current?.focus()
      input.current?.select()
    }
  }, [share])
  async function copyLink() {
    const url = new URL('/lego/', location.origin)
    url.searchParams.set('lang', locale)
    try {
      await navigator.clipboard.writeText(url.href)
      setShare({ copied: true })
    } catch {
      setShare({ url: url.href })
    }
  }
  const open = dialog => dispatch({ type: 'dialog', dialog })
  return (
    <nav
      className="game-nav game-header"
      aria-label={locale === 'sk' ? 'Navigácia hry' : 'Game navigation'}
    >
      <div className="game-nav__inner">
        <div className="game-nav__trail">
          <a
            className="game-nav__mark"
            href={locale === 'sk' ? '/sk/#about' : '/#about'}
            title={t.portfolio}
            aria-label={t.portfolio}
          >
            <span className="game-nav__bracket">[</span>
            AM
            <span className="game-nav__bracket">]</span>
          </a>
          <span className="game-nav__separator" aria-hidden="true">
            /
          </span>
          <a
            className="game-nav__crumb"
            href={`/games/?lang=${locale}`}
            title={t.games}
          >
            Games
          </a>
          <span className="game-nav__separator" aria-hidden="true">
            /
          </span>
          <button
            className="game-nav__current game-brand"
            onClick={() => dispatch({ type: 'collection' })}
            title={t.collection}
          >
            brick break
          </button>
        </div>
        <div className="game-nav__actions game-header-actions">
          <div
            className="locale"
            role="group"
            aria-label={locale === 'sk' ? 'Jazyk' : 'Language'}
          >
            {['en', 'sk'].map(language => (
              <button
                key={language}
                className={`locale__option${locale === language ? ' is-active' : ''}`}
                onClick={() => {
                  setLocale(language)
                  setShare(null)
                }}
                lang={language}
                aria-label={language === 'en' ? 'English' : 'Slovenčina'}
                aria-pressed={locale === language}
              >
                {language.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="game-nav__icon"
            onClick={toggleTheme}
            title={themeLabel}
            aria-label={themeLabel}
          >
            {theme === 'light' ? (
              <Moon aria-hidden="true" />
            ) : (
              <Sun aria-hidden="true" />
            )}
          </button>
          {state.screen === 'build' && (
            <button
              className="game-nav__icon game-back"
              aria-label={t.collection}
              title={t.collection}
              onClick={() => dispatch({ type: 'collection' })}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
          )}
          <button
            className="game-nav__icon"
            onClick={copyLink}
            aria-label={t.share}
            title={t.share}
          >
            {share?.copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </button>
          <button
            className="game-nav__icon"
            onClick={() => dispatch({ type: 'mute' })}
            title={state.saved.muted ? t.soundOn : t.soundOff}
            aria-label={state.saved.muted ? t.soundOn : t.soundOff}
          >
            {state.saved.muted ? (
              <VolumeX aria-hidden="true" />
            ) : (
              <Volume2 aria-hidden="true" />
            )}
          </button>
          <button
            className="game-nav__icon"
            onClick={() => open('settings')}
            title={t.settings}
            aria-label={t.settings}
          >
            <Settings aria-hidden="true" />
          </button>
          <button
            className="game-nav__icon"
            onClick={() => open('help')}
            title={t.help}
            aria-label={t.help}
          >
            <HelpCircle aria-hidden="true" />
          </button>
        </div>
        {share && (
          <div className="game-share-feedback">
            <span role="status">
              {share.copied ? t.shared : t.copyManually}
            </span>
            {share.url && (
              <input
                ref={input}
                value={share.url}
                readOnly
                aria-label={t.link}
                onFocus={event => event.target.select()}
              />
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
