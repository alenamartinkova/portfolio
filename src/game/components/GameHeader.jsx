import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Blocks,
  Check,
  Copy,
  HelpCircle,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useLocale, useT } from '../i18n'

export default function GameHeader({ state, dispatch }) {
  const t = useT()
  const [locale, setLocale] = useLocale()
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
    <>
      <div className="game-site-bar">
        <a
          href={locale === 'sk' ? '/sk/#about' : '/#about'}
          title={t.portfolio}
        >
          <ArrowLeft aria-hidden="true" />
          Alena Martinková
        </a>
        <div className="game-site-actions">
          <button
            onClick={() => {
              setLocale(locale === 'sk' ? 'en' : 'sk')
              setShare(null)
            }}
            lang={locale === 'sk' ? 'en' : 'sk'}
            aria-label={locale === 'sk' ? 'English' : 'Slovenčina'}
          >
            {locale === 'sk' ? 'EN' : 'SK'}
          </button>
          <button onClick={copyLink}>
            {share?.copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {t.share}
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
      <header className="game-header">
        <button
          className="game-brand"
          onClick={() => dispatch({ type: 'collection' })}
        >
          <Blocks aria-hidden="true" />
          <span>
            brick break<small>{t.brand}</small>
          </span>
        </button>
        <div className="game-header-actions">
          {state.screen === 'build' && (
            <button
              className="game-back"
              onClick={() => dispatch({ type: 'collection' })}
            >
              <ArrowLeft aria-hidden="true" />
              <span>{t.collection}</span>
            </button>
          )}
          <button
            className="game-icon-button"
            onClick={() => dispatch({ type: 'mute' })}
            title={state.saved.muted ? t.soundOn : t.soundOff}
            aria-label={state.saved.muted ? t.soundOn : t.soundOff}
          >
            {state.saved.muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            className="game-icon-button"
            onClick={() => open('settings')}
            title={t.settings}
            aria-label={t.settings}
          >
            <Settings />
          </button>
          <button
            className="game-icon-button"
            onClick={() => open('help')}
            title={t.help}
            aria-label={t.help}
          >
            <HelpCircle />
          </button>
        </div>
      </header>
    </>
  )
}
