import './LanguageLink.css'

export default function LanguageLink({ locale, onChange, page = 'portfolio' }) {
  const next = locale === 'sk' ? 'en' : 'sk'
  const href = page === 'games' ? `/games/?lang=${next}` : next === 'sk' ? '/sk/' : '/'

  return <a className="m-locale" href={href} hrefLang={next} lang={next}
    aria-label={next === 'en' ? 'Switch to English' : 'Prepnúť do slovenčiny'}
    onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      onChange(next)
    }}>{next.toUpperCase()}</a>
}
