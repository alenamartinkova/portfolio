import './AboutMe.css'
import { Handshake, Rocket, Wrench } from 'lucide-react'
import Reveal from './Reveal'

// Above 860px the photo column is ~430px wide; below it the frame is capped
// at 340px. Retina picks the 2x variants from the same srcset.
const IMAGE_SIZES = '(min-width: 861px) 430px, 340px'

const stats = [
  { value: '6+', label: 'Years shipping digital products' },
  {
    value: '20+',
    label: 'Production services & web apps delivered end-to-end',
  },
  { value: '2', label: 'Cross-functional teams led' },
]

const notes = [
  {
    Icon: Wrench,
    text: 'My go-to stack is Python (FastAPI), PostgreSQL, Redis, RabbitMQ, React. I care about clean architecture, efficient solutions, observability, and proper testing (PyTest, Cypress).',
  },
  {
    Icon: Handshake,
    text: 'I enjoy leading teams, mentoring engineers, and keeping delivery calm and predictable. Outside the code, I like getting involved in the creative side—anything that improves the user experience.',
  },
]

export default function AboutMe() {
  return (
    <section className="section shell" id="about">
      <div className="about__layout">
        <Reveal className="section__header about__header">
          <p className="section__index">
            <b>01</b> / about
          </p>
          <h2>
            Backend engineer with a product mindset and focus on clean, reliable
            systems
          </h2>
          <p className="section__description">
            <Rocket className="about__inline-icon" aria-hidden="true" />
            I’m a backend-leaning full-stack developer who builds fast, reliable
            web platforms. Since 2019 I’ve shipped everything from e-commerce
            and booking systems to internal tools and real-time data
            products—currently leading backend at Rankacy, previously at
            Moravio and GIMMEDATA. I partner closely with design and product so
            each release is cohesive, measurable, and performant.
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
              Currently building at Rankacy
            </figcaption>
          </figure>
        </Reveal>

        <Reveal className="about__copy">
          {notes.map(({ Icon, text }) => (
            <p className="about__note" key={text}>
              <span className="about__note-icon">
                <Icon aria-hidden="true" />
              </span>
              {text}
            </p>
          ))}
        </Reveal>
      </div>

      <Reveal className="stat-grid">
        {stats.map(stat => (
          <article className="stat-card panel panel--hover" key={stat.label}>
            <span className="stat-card__value">{stat.value}</span>
            <p>{stat.label}</p>
          </article>
        ))}
      </Reveal>
    </section>
  )
}
