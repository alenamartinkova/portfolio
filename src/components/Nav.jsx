import { useEffect, useState } from 'react'
import './Nav.css'
import { useActiveSection, useScrollProgress } from '../hooks'
import { useT } from '../i18n'
import ThemeToggle from './ThemeToggle'
import Customizer from './Customizer'

// Section ids are part of the URL, so they stay in English regardless of locale.
const LINKS = [
  { id: 'about', key: 'about' },
  { id: 'skills', key: 'stack' },
  { id: 'journey', key: 'journey' },
  { id: 'projects', key: 'work' },
  { id: 'contact', key: 'contact' },
]

const ids = LINKS.map(link => link.id)

export default function Nav() {
  const t = useT()
  const progress = useScrollProgress()
  const active = useActiveSection(ids)
  const [stuck, setStuck] = useState(false)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${stuck ? ' nav--stuck' : ''}`} aria-label={t.nav.sections}>
      <div className="nav__inner shell">
        <a className="nav__mark" href="#top">
          <span className="nav__mark-bracket">[</span>
          AM
          <span className="nav__mark-bracket">]</span>
        </a>

        <ul className="nav__links">
          {LINKS.map(link => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={`nav__link${active === link.id ? ' is-active' : ''}`}
                aria-current={active === link.id ? 'true' : undefined}
              >
                {t.nav[link.key]}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav__end">
          <p className="nav__status">
            <span className="status-dot" />
            {t.nav.status}
          </p>
          <ThemeToggle />
          <Customizer />
        </div>
      </div>

      <div
        className="nav__progress"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  )
}
