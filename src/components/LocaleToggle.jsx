import './LocaleToggle.css'
import { LOCALES, useLocale, useT } from '../i18n'

export default function LocaleToggle() {
  const t = useT()
  const [locale, setLocale] = useLocale()

  return (
    <div
      className="locale"
      role="group"
      aria-label={t.appearance.language}
    >
      {LOCALES.map(item => (
        <button
          key={item.id}
          type="button"
          className={`locale__option${locale === item.id ? ' is-active' : ''}`}
          onClick={() => setLocale(item.id)}
          aria-pressed={locale === item.id}
          lang={item.id}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
