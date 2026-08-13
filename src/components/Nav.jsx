import { useEffect, useRef, useState } from 'react'
import './Nav.css'
import { Menu, X } from 'lucide-react'
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

// Keep in sync with the breakpoint in Nav.css that swaps the rail for the menu.
const MENU_QUERY = '(min-width: 621px)'

export default function Nav() {
  const t = useT()
  const progress = useScrollProgress()
  const active = useActiveSection(ids)
  const [stuck, setStuck] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Leaving the mobile breakpoint must not strand an open menu.
  useEffect(() => {
    const query = window.matchMedia(MENU_QUERY)
    const onChange = event => {
      if (event.matches) setMenuOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = event => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const onPointerDown = event => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  return (
    <nav
      className={`nav${stuck ? ' nav--stuck' : ''}`}
      aria-label={t.nav.sections}
      ref={navRef}
    >
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

          <button
            type="button"
            className="nav__burger"
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            aria-label={t.nav.menu}
            onClick={() => setMenuOpen(value => !value)}
          >
            {menuOpen ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="nav__menu" id="nav-menu">
          <ul>
            {LINKS.map(link => (
              <li key={link.id}>
                <a
                  href={`#${link.id}`}
                  className={`nav__menu-link${active === link.id ? ' is-active' : ''}`}
                  aria-current={active === link.id ? 'true' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {t.nav[link.key]}
                </a>
              </li>
            ))}
          </ul>

          {/* The status pill is hidden at this width, so surface it here. */}
          <p className="nav__menu-status">
            <span className="status-dot" />
            {t.nav.status}
          </p>
        </div>
      )}

      <div
        className="nav__progress"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  )
}
