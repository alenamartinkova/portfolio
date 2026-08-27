import './AboutMe.css'
import { Handshake, Rocket, Wrench } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Above 860px the photo column is ~430px wide; below it the frame is capped
// at 340px. Retina picks the 2x variants from the same srcset.
const IMAGE_SIZES = '(min-width: 861px) 430px, 340px'

// now() − first client work, so the counter never goes stale in the repo.
const CAREER_START = 2019
const STAT_VALUES = [`${new Date().getFullYear() - CAREER_START}+`, '40+', '2']
const NOTE_ICONS = [Wrench, Handshake]

export default function AboutMe() {
  const t = useT()

  return (
    <section className="section shell" id="about">
      <div className="about__layout">
        <Reveal className="section__header about__header">
          <p className="section__index">
            <b>01</b> / {t.about.index}
          </p>
          <h2>{t.about.title}</h2>
          <p className="section__description">
            <Rocket className="about__inline-icon" aria-hidden="true" />
            {t.about.description}
          </p>
        </Reveal>

        <Reveal className="about__aside">
          <figure className="about__frame panel">
            <div className="panel__chrome">
              <span className="panel__chrome-dot panel__chrome-dot--accent" />
              me.jpg
            </div>
            <picture>
              <source
                type="image/webp"
                srcSet="/images/me-340.webp 340w, /images/me-430.webp 430w, /images/me-680.webp 680w, /images/me-860.webp 860w"
                sizes={IMAGE_SIZES}
              />
              <img
                src="/images/me-430.jpg"
                srcSet="/images/me-340.jpg 340w, /images/me-430.jpg 430w, /images/me-680.jpg 680w, /images/me-860.jpg 860w"
                sizes={IMAGE_SIZES}
                width="860"
                height="1290"
                alt="Alena Martinková"
                loading="lazy"
                decoding="async"
              />
            </picture>
            <figcaption>
              <span className="status-dot" />
              {t.about.caption}
            </figcaption>
          </figure>
        </Reveal>

        <Reveal className="about__copy">
          {t.about.notes.map((text, index) => {
            const Icon = NOTE_ICONS[index]
            return (
              <p className="about__note" key={text}>
                <span className="about__note-icon">
                  <Icon aria-hidden="true" />
                </span>
                {text}
              </p>
            )
          })}
        </Reveal>
      </div>

      <Reveal className="stat-grid stagger">
        {t.about.stats.map((label, index) => (
          <article className="stat-card panel panel--hover" key={label}>
            {/* The prerender bakes in the build-time year, which can lag the
                visitor's clock across a New Year. */}
            <span className="stat-card__value" suppressHydrationWarning>
              {STAT_VALUES[index]}
            </span>
            <p>{label}</p>
          </article>
        ))}
      </Reveal>
    </section>
  )
}
