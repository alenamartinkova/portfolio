import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, Copy, Code2, Database, Layers, Network, Pause, Play, Server, Workflow } from 'lucide-react'
import { LocaleProvider, useLocale, useT } from '../i18n'
import { useCopy } from '../hooks'
import { PROJECTS } from './projects'
import useMotion from './useMotion'
import { setAppearancePreference } from '../../shared/appearance.js'
import ColorPicker, { readAccent } from './ColorPicker'
import ClientWork from './ClientWork'
import AboutSection from './AboutSection'
import LanguageLink from '../components/LanguageLink'
import ThemeToggle from '../components/ThemeToggle'
import '../../shared/styles/appearance-controls.css'
import './motion.css'
import './choreography.css'

const EMAIL = 'martinkova.a@gmail.com'
const LINKEDIN = 'https://www.linkedin.com/in/alena-martinkova/'
const LABELS = {
  sk: { scroll: 'Scrollujte a spoznajte ma', first: 'Od nápadu.', second: 'Po produkciu.', expertise: 'Premyslené do poslednej vrstvy.', selected: 'Práca, ktorá žije.', journey: 'Každý krok sa počíta.', contact: 'Poďme niečo', contactEnd: 'postaviť.', motion: 'Animácie', on: 'zapnuté', off: 'vypnuté', portrait: 'Za kódom som ja.', layers: ['01 / PRODUKT', '02 / BACKEND', '03 / DÁTA', '04 / INFRAŠTRUKTÚRA'], stack: 'Jeden celok. Od rozhrania až po infraštruktúru.' },
  en: { scroll: 'Scroll to get to know me', first: 'From an idea.', second: 'To production.', expertise: 'Every layer. Considered.', selected: 'Work that lives on.', journey: 'Every step adds up.', contact: 'Let’s build', contactEnd: 'something.', motion: 'Animations', on: 'on', off: 'off', portrait: 'The person behind the code.', layers: ['01 / PRODUCT', '02 / BACKEND', '03 / DATA', '04 / INFRASTRUCTURE'], stack: 'One system. From the interface to infrastructure.' },
}

function SectionLabel({ number, children }) {
  return <p className="m-label"><span>{number}</span>{children}</p>
}

function ExternalLink({ href, children, className = '' }) {
  return <a className={`m-link ${className}`} href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={19} aria-hidden="true" /></a>
}

function PortfolioPage() {
  const [locale, setLocale] = useLocale()
  const [accent, setAccent] = useState(readAccent)
  const [motion, setMotion] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const root = useRef(null)
  const [copied, copy] = useCopy(EMAIL)
  const t = useT()
  const l = LABELS[locale]
  useMotion(root, motion, locale)

  useEffect(() => {
    setAppearancePreference('accent', accent.id)
  }, [accent])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setMotion(!media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  return (
    <div className="motion-page" data-motion={motion ? 'on' : 'off'} ref={root}>
      <a className="m-skip" href="#about">{t.nav.skip}</a>
      <header className="m-nav">
        <div className="m-nav-identity">
          <a className="m-brand" href="#top" aria-label="Alena Martinková">am<span>.</span></a>
          <span className="m-nav-status" title={t.nav.status}><span className="m-status-dot" aria-hidden="true" /><span>Rankacy</span></span>
        </div>
        <nav aria-label={t.nav.sections}>
          <a href="#about">{t.nav.about}</a>
          <a href="#stack">{t.nav.stack}</a>
          <a href="#work">{t.nav.work}</a>
          <a href="#career">{t.nav.career}</a>
          <a href="#contact">{t.nav.contact}</a>
        </nav>
        <div className="m-controls appearance-controls">
          <ThemeToggle />
          <ColorPicker accent={accent} onChange={setAccent} locale={locale} />
          <button className="m-motion-toggle" onClick={() => setMotion(value => !value)} aria-pressed={motion} aria-label={`${l.motion}: ${motion ? l.on : l.off}`} title={`${l.motion}: ${motion ? l.on : l.off}`}>
            {motion ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <LanguageLink locale={locale} onChange={setLocale} />
        </div>
        <div className="m-progress" aria-hidden="true" />
      </header>

      <main id="main">
        <section className="m-hero" id="top" data-scene="hero">
          <div className="m-hero-stage">
            <div className="m-hero-copy">
              <p className="m-eyebrow">ALENA MARTINKOVÁ <span> / </span> {t.hero.eyebrow}</p>
              <h1><span className="m-hero-line"><span key={`${locale}-first`}>{l.first}</span></span>{' '}<span className="m-hero-line m-hero-accent"><span key={`${locale}-second`}>{l.second}</span></span></h1>
              <div className="m-hero-bottom"><p>{t.hero.role}<br /><span className="m-current-role"><span className="m-status-dot" aria-hidden="true" />{t.nav.status}</span></p><a href="#about">{l.scroll}<ArrowDown size={18} aria-hidden="true" /></a></div>
            </div>
            <span className="m-hero-side" aria-hidden="true">FULL STACK · TECH & TEAM LEAD</span>
          </div>
        </section>

        <AboutSection t={t} locale={locale} />

        <section className="m-stack" id="stack" data-scene="stack">
          <div className="m-stack-stage m-shell">
            <div className="m-stack-heading"><SectionLabel number="02">{t.skills.index}</SectionLabel><h2>{l.expertise}</h2><p>{l.stack}</p></div>
            <div className="m-layers" aria-label={t.skills.title}>
              {[
                { name: 'React / Vue', label: 'UI', Icon: Code2, detail: 'State · Forms · Real-time' },
                { name: 'Python / FastAPI', label: 'API', Icon: Server, detail: 'REST · SQLAlchemy · Stripe' },
                { name: 'RabbitMQ', label: 'EVENTS', Icon: Workflow, detail: 'Event-driven · Async jobs' },
                { name: 'PostgreSQL', label: 'DATABASE', Icon: Database, detail: 'Data models · SQL' },
                { name: 'Redis', label: 'CACHE', Icon: Layers, detail: 'Cache · Fast reads' },
                { name: 'Docker / Kubernetes', label: 'DELIVERY', Icon: Network, detail: 'CI/CD · PyTest · Cypress' },
              ].map(({ name, label, Icon, detail }, i) => <div className="m-layer-slot" data-motion-item data-tilt key={name} style={{ '--layer': i, '--direction': i % 2 ? 1 : -1 }}><div className="m-layer"><span>{String(i + 1).padStart(2, '0')} / {label}</span><Icon aria-hidden="true" /><strong>{name}</strong><p>{detail}</p></div></div>)}
            </div>
          </div>
          <div className="m-skills m-shell">
            {t.skills.groups.map((group, i) => <article data-reveal key={group.title}><span className="m-mono">0{i + 1}</span><h3>{group.title}</h3><p>{group.description}</p><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}
          </div>
        </section>

        <section className="m-work m-shell" id="work">
          <div className="m-work-heading" data-reveal><SectionLabel number="03">{t.work.index}</SectionLabel><h2>{l.selected}</h2><p className="m-intro">{t.work.description}</p></div>
          <div className="m-projects">
            {PROJECTS.map((project, i) => <article className={`m-project m-project-${i}`} data-project key={project.name} style={{ '--project': i }}>
              <div className="m-project-top"><span className="m-mono">0{i + 1} / {t.work.projects[i].type}</span><span className="m-project-credit">{project.current ? 'Backend Lead' : `${t.work.via} ${project.via}`}</span></div>
              <div className="m-project-title"><h3>{project.name}<span>.</span></h3><ExternalLink href={project.link}>{t.work.projects[i].linkLabel}</ExternalLink></div>
              <div className="m-project-details"><p>{t.work.projects[i].summary}</p><ul>{t.work.projects[i].highlights.map(item => <li key={item}>{item}</li>)}</ul></div>
              <div className="m-tags">{project.stack.split(' · ').map(tech => <span key={tech}>{tech}</span>)}</div>
              <span className="m-project-watermark" aria-hidden="true">0{i + 1}</span>
            </article>)}
          </div>
          <ClientWork t={t} locale={locale} motion={motion} />
        </section>

        <section className="m-career m-shell" id="career" data-scene="career">
          <div className="m-career-heading"><SectionLabel number="04">{t.career.index}</SectionLabel><h2>{l.journey}</h2><ExternalLink href={LINKEDIN}>{t.career.linkedin}</ExternalLink><div className="m-career-year" aria-hidden="true"><div className="m-year-track">{t.career.items.map((item, i) => <span key={i}>{item.period.slice(0, 4)}</span>)}</div></div></div>
          <ol className="m-timeline">{t.career.items.map((item, i) => <li data-motion-item key={item.title}><span className="m-timeline-node" aria-hidden="true" /><div className="m-timeline-content"><p className="m-mono">{item.period}</p><h3>{item.title}</h3><p>{item.description}</p><span className="m-timeline-number" aria-hidden="true">0{i + 1}</span></div></li>)}</ol>
        </section>

        <section className="m-contact" id="contact" data-scene="contact" data-motion-item>
          <div className="m-shell"><SectionLabel number="05">{t.contact.index}</SectionLabel><h2><span className="m-contact-line">{l.contact}</span><span className="m-contact-line">{l.contactEnd}</span></h2><div className="m-contact-bottom"><div><h3>{t.contact.title}</h3><p>{t.contact.note}</p></div><div className="m-contact-links"><a className="m-email" href={`mailto:${EMAIL}`}>{EMAIL}<ArrowUpRight aria-hidden="true" /></a><div><button className="m-link" onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copied ? t.contact.copied : t.contact.copy}</button><ExternalLink href={LINKEDIN}>LinkedIn</ExternalLink></div><span className="m-sr" role="status">{copied ? t.contact.copied : ''}</span></div></div></div>
        </section>
      </main>
      <footer className="m-footer m-shell"><a className="m-brand" href="#top">am<span>.</span></a><span>© {new Date().getFullYear()} Alena Martinková</span><a href={`/games/?lang=${locale}`}>{t.games.heading} <ArrowUpRight size={15} aria-hidden="true" /></a></footer>
    </div>
  )
}

export default function MotionPortfolio({ ssrLocale }) {
  return <LocaleProvider ssrLocale={ssrLocale}><PortfolioPage /></LocaleProvider>
}
