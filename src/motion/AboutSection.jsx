import { Blocks, MapPin, Server, Users } from 'lucide-react'
import './about.css'

const COPY = {
  sk: {
    title: ['Kódim.', 'Vediem.'],
    story: 'Od frontendu k vedeniu tímu',
    approach: 'Ako pracujem',
    principles: ['Architektúra v praxi', 'Vedenie bez mikromanažmentu'],
  },
  en: {
    title: ['I code.', 'I lead.'],
    story: 'From frontend to team leadership',
    approach: 'How I work',
    principles: ['Architecture in practice', 'Leadership without micromanagement'],
  },
}
const PRINCIPLE_ICONS = [Server, Users]

export default function AboutSection({ t, locale }) {
  const copy = COPY[locale]

  return <section className="m-about m-shell" id="about" aria-labelledby="about-title">
    <div className="m-about-opening" data-reveal>
      <p className="m-label"><span>01</span>{t.about.index}</p>
      <div className="m-about-layout">
        <aside className="m-profile" aria-label="Alena Martinková">
          <figure className="m-portrait">
            <img
              src="/images/me-430.webp"
              srcSet="/images/me-430.webp 430w, /images/me-860.webp 860w"
              sizes="(max-width: 640px) min(320px, 100vw - 40px), 320px"
              width="860" height="1290" alt="Alena Martinková" loading="lazy" decoding="async"
            />
            <figcaption><span className="m-status-dot" aria-hidden="true" />{t.about.caption}</figcaption>
          </figure>
          <div className="m-profile-identity">
            <p className="m-profile-name">Alena Martinková</p>
            <p className="m-profile-location"><MapPin size={15} aria-hidden="true" />Ostrava · remote</p>
          </div>
          <p className="m-profile-note"><Blocks size={21} aria-hidden="true" /><span>{t.about.funFact}{' '}<a href={`/games/?lang=${locale}`}>{t.about.playLabel}</a></span></p>
        </aside>
  
        <div className="m-about-intro">
          <h2 id="about-title">{copy.title[0]}{' '}<span>{copy.title[1]}</span></h2>
          <p>{t.hero.lead}</p>
        </div>
        <div className="m-about-story">
          <h3>{copy.story}</h3>
          <p>{t.about.description}</p>
        </div>
      </div>
    </div>

    <div className="m-about-approach" data-reveal aria-labelledby="about-approach-title">
      <h3 className="m-about-kicker" id="about-approach-title">{copy.approach}</h3>
      <div className="m-about-principles">
        {t.about.notes.map((note, i) => {
          const Icon = PRINCIPLE_ICONS[i]
          return <article key={i}>
            <span className="m-principle-icon"><Icon size={21} aria-hidden="true" /></span>
            <div><h4>{copy.principles[i]}</h4><p>{note}</p></div>
          </article>
        })}
      </div>
    </div>

    <div className="m-stats">{t.about.stats.map((stat, i) => {
      const target = [new Date().getFullYear() - 2019, 40, 4][i]
      const suffix = i < 2 ? '+' : ''
      return <div data-motion-item key={stat}>
        <div className="m-stat-body">
          <strong><span className="m-sr">{target}{suffix}</span><span aria-hidden="true"><span data-count={target}>{target}</span>{suffix}</span></strong>
          <p>{stat}</p>
        </div>
      </div>
    })}</div>
  </section>
}
