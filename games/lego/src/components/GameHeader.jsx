import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  Copy,
  HelpCircle,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLocale, useT } from '../i18n'
import { mountGameAppearance } from '../../../../shared/game-appearance.js'

function GameAppearance({ locale, onLocaleChange }) {
  const root = useRef(null)
  useEffect(() => mountGameAppearance(root.current, { locale, onLocaleChange }), [locale, onLocaleChange])
  return <div data-game-appearance ref={root} />
}

export default function GameHeader({ state, dispatch }) {
  const t = useT()
  const [locale, setLocale] = useLocale()
  const [share, setShare] = useState(null)
  const input = useRef(null)
  useEffect(() => setShare(null), [locale])
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
            am<span className="game-nav__dot">.</span>
          </a>
          <span className="game-nav__separator" aria-hidden="true">
            /
          </span>
          <a
            className="game-nav__crumb"
            href={`/games/?lang=${locale}`}
            title={t.games}
          >
            {locale === 'sk' ? 'Hry' : 'Games'}
          </a>
          <span className="game-nav__separator" aria-hidden="true">
            /
          </span>
          <button
            className="game-nav__current game-brand"
            onClick={() => dispatch({ type: 'collection' })}
            title={t.collection}
          >
            Brick Break
          </button>
        </div>
        <div className="game-nav__actions game-header-actions">
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
          <GameAppearance locale={locale} onLocaleChange={setLocale} />
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
