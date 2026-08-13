import './Header.css'
import { ArrowDown, Mail } from 'lucide-react'
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6'
import { useT } from '../i18n'
import HeroTerminal from './HeroTerminal'

export default function Header() {
  const t = useT()

  return (
    <header id="top" className="hero">
      <div className="shell hero__grid">
        <div className="hero__intro">
          <p className="hero__eyebrow">{t.hero.eyebrow}</p>

          <h1 className="hero__title">
            Alena Martinková
            <span>{t.hero.role}</span>
          </h1>

          <p className="hero__lead">{t.hero.lead}</p>

          <div className="hero__actions">
            <a href="#contact" className="button-primary">
              <Mail aria-hidden="true" />
              {t.hero.ctaContact}
            </a>
            <a href="#projects" className="button-secondary">
              <ArrowDown aria-hidden="true" />
              {t.hero.ctaWork}
            </a>
          </div>

          <div className="hero__social">
            <a
              href="https://www.linkedin.com/in/alena-martinkova/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn aria-hidden="true" />
              LinkedIn
            </a>
            <a
              href="https://github.com/alenamartinkova"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <FaGithub aria-hidden="true" />
              GitHub
            </a>
          </div>
        </div>

        <HeroTerminal />
      </div>
    </header>
  )
}
