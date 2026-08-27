import './References.css'
import { ArrowUpRight } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Locale-invariant: names, URLs, stacks, client lists and whether the
// engagement is still running. Merged with the translated copy by index.
const PROJECTS = [
  {
    name: 'Rankacy',
    link: 'https://www.rankacy.com',
    stack: 'FastAPI · PostgreSQL · Redis · RabbitMQ · Stripe · AWS · Docker',
    current: true,
  },
  {
    name: 'SVX',
    link: 'https://www.svx.cz',
    stack: 'FastAPI · PostgreSQL · React · Payment & shipping APIs',
    via: 'WAPS Technologies',
  },
  {
    name: 'WAPS Technologies',
    stack: 'Laravel · React · PHP',
    current: true,
    clients: ['Kausta Ondruš', 'SVX'],
  },
  {
    name: 'Moravio',
    link: 'https://moravio.com',
    stack: 'Laravel · Node · React · Strapi · WordPress · MySQL · Docker',
    clients: ['Kofola', 'Stamaco', 'Můj Chlupáč'],
  },
  {
    name: 'GIMMEDATA',
    stack: 'Vue.js · GraphQL · HTML · CSS',
    clients: ['Tiketo'],
  },
]

function ProjectCard({ project, copy, t }) {
  return (
    <article className="project-card panel panel--hover">
      <div className="panel__chrome">
        <span className="panel__chrome-dot" />
        {copy.type}
      </div>

      <div className="panel__body">
        <div className="project-card__head">
          <h3>{project.name}</h3>
          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="link-arrow"
            >
              {copy.linkLabel}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="project-card__grid">
          <div className="project-card__meta">
            {copy.role && (
              <p className="project-card__role">
                {project.current && <span className="status-dot" />}
                {copy.role}
              </p>
            )}
            {copy.period && (
              <p className="project-card__period">{copy.period}</p>
            )}
            {copy.previous && (
              <p className="project-card__note">
                {t.work.previously}: {copy.previous}
              </p>
            )}
            {project.via && (
              <p className="project-card__note">
                {t.work.via} {project.via}
              </p>
            )}

            {project.clients && (
              <div className="project-card__clients">
                <p className="project-card__clients-key">
                  {t.work.clientsLabel}
                </p>
                <ul>
                  {project.clients.map(client => (
                    <li key={client}>{client}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="project-card__content">
            <p className="project-card__summary">{copy.summary}</p>

            {copy.highlights?.length > 0 && (
              <ul className="project-card__highlights">
                {copy.highlights.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

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
}

export default function References() {
  const t = useT()

  return (
    <section className="section shell" id="projects">
      <Reveal className="section__header">
        <p className="section__index">
          <b>03</b> / {t.work.index}
        </p>
        <h2>{t.work.title}</h2>
        <p className="section__description">{t.work.description}</p>
      </Reveal>

      <Reveal className="projects-grid stagger">
        {PROJECTS.map((project, index) => (
          <ProjectCard
            key={project.name}
            project={project}
            copy={t.work.projects[index]}
            t={t}
          />
        ))}
      </Reveal>
    </section>
  )
}
