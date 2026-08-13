import { useEffect, useState } from 'react'
import './Nav.css'
import { useActiveSection, useScrollProgress } from '../hooks'
import ThemeToggle from './ThemeToggle'

const links = [
  { id: 'about', label: 'about' },
  { id: 'skills', label: 'stack' },
  { id: 'journey', label: 'journey' },
  { id: 'projects', label: 'work' },
  { id: 'contact', label: 'contact' },
]

const ids = links.map(link => link.id)

export default function Nav() {
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
    <nav className={`nav${stuck ? ' nav--stuck' : ''}`} aria-label="Sections">
      <div className="nav__inner shell">
        <a className="nav__mark" href="#top">
          <span className="nav__mark-bracket">[</span>
          AM
          <span className="nav__mark-bracket">]</span>
        </a>

        <ul className="nav__links">
          {links.map(link => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                className={`nav__link${active === link.id ? ' is-active' : ''}`}
                aria-current={active === link.id ? 'true' : undefined}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="nav__end">
          <p className="nav__status">
            <span className="status-dot" />
            Backend Lead @ Rankacy
          </p>
          <ThemeToggle />
        </div>
      </div>

      <div
        className="nav__progress"
        style={{ transform: `scaleX(${progress})` }}
      />
    </nav>
  )
}
