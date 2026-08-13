import './References.css'
import { ArrowUpRight } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Locale-invariant: names, URLs and tech stacks. Merged with the translated
// copy by index.
const PROJECTS = [
  {
    name: 'Rankacy',
    link: 'https://www.rankacy.com',
    stack: 'FastAPI · PostgreSQL · Redis · RabbitMQ · Stripe · AWS',
  },
  {
    name: 'Moravio',
    link: 'https://moravio.com',
    stack: 'React · PHP · WordPress · MySQL · Docker',
  },
  {
    name: 'SVX',
    link: 'https://www.svx.cz',
    stack: 'FastAPI · PostgreSQL · React · Payment & shipping APIs',
  },
]

const CLIENTS = [
  'Rankacy',
  'Moravio',
  'Kausta Ondruš',
  'Tiketo',
  'Kofola',
  'SVX',
  'Stamaco',
  'Můj Chlupáč',
]

export default function References() {
  const t = useT()

  return (
    <section className="section shell" id="projects">
      <Reveal className="section__header">
        <p className="section__index">
          <b>04</b> / {t.work.index}
        </p>
        <h2>{t.work.title}</h2>
        <p className="section__description">{t.work.description}</p>
      </Reveal>

      <Reveal className="projects-grid">
        {PROJECTS.map((project, index) => {
          const copy = t.work.projects[index]

          return (
            <article
              className="project-card panel panel--hover"
              key={project.name}
            >
              <div className="panel__chrome">
                <span className="panel__chrome-dot" />
                {copy.type}
              </div>

              <div className="panel__body">
                <div className="project-card__title">
                  <h3>{project.name}</h3>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className="link-arrow"
                  >
                    {copy.linkLabel}
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </div>

                <p className="project-card__summary">{copy.summary}</p>

                <ul className="project-card__highlights">
                  {copy.highlights.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <div className="project-card__stack chip-row">
                  {project.stack.split('·').map(tech => (
                    <span className="chip" key={tech}>
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          )
        })}
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>{t.work.clientsLabel}</h3>
        </div>
        <ul className="client-grid">
          {CLIENTS.map(client => (
            <li className="client-grid__cell" key={client}>
              {client}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
