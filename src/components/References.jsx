import './References.css'
import { ArrowUpRight } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Locale-invariant: names, URLs, stacks and attribution. Merged with the
// translated copy by index. Career history (roles, dates) lives in the Career
// timeline, so these cards stay purely about what was built.
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
    stack: 'Python · FastAPI · React · PostgreSQL · Payment & shipping APIs',
    via: 'WAPS Technologies',
  },
  {
    name: 'Spanamo',
    link: 'https://www.spanamo.com',
    stack: 'Laravel · React · MySQL',
    via: 'Moravio',
  },
]

// The longer tail of client deliveries — one line each, biggest names first.
// Attribution (which agency the work ran through) lives in the Career
// timeline; repeating it on every card would just be noise.
const MORE = [
  {
    name: 'Kofola',
    link: 'https://investor.kofola.cz',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Veolia',
    link: 'https://www.vecr.cz',
    stack: 'Drupal · PHP',
  },
  {
    name: 'Janáčkova filharmonie',
    link: 'https://www.jfo.cz',
    stack: 'WordPress · Shopsys · PHP',
  },
  {
    name: 'Bushman',
    link: 'https://bushman.cz',
    stack: 'PHP · e-commerce',
  },
  {
    name: 'Pedro · Candy Plus',
    link: 'https://www.candyplus.cz',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Sareza',
    link: 'https://www.sareza.cz',
    stack: 'WordPress · Laravel',
  },
  {
    name: 'FINIDR',
    link: 'https://www.finidr.cz',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Jelínek',
    link: 'https://www.jelinek.eu',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Chefparade',
    link: 'https://www.chefparade.cz',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Finclub',
    link: 'https://www.finclub.cz',
    stack: 'Shopsys · PHP',
  },
  {
    name: 'Stamaco',
    link: 'https://stamaco.cz',
    stack: 'WordPress · PHP',
  },
  {
    name: 'Kausta & Partners',
    link: 'https://kaustaondrus.cz',
    stack: 'WordPress · PHP',
  },
]

function ProjectCard({ project, copy, t }) {
  return (
    <article className="project-card panel panel--hover">
      <div className="panel__chrome">
        <span className="panel__chrome-dot" />
        {copy.type}
        {project.current && <span className="status-dot" />}
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

        <div className="project-card__content">
          {project.via && (
            <p className="project-card__note">
              {t.work.via} {project.via}
            </p>
          )}

          <p className="project-card__summary">{copy.summary}</p>

          {copy.highlights?.length > 0 && (
            <ul className="project-card__highlights">
              {copy.highlights.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
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

function MiniCard({ project, copy }) {
  return (
    <a
      className="mini-card panel panel--hover"
      href={project.link}
      target="_blank"
      rel="noreferrer"
    >
      <p className="mini-card__head">
        <span className="mini-card__name">{project.name}</span>
        <ArrowUpRight aria-hidden="true" />
      </p>
      <p className="mini-card__summary">{copy.summary}</p>
      <p className="mini-card__stack">{project.stack}</p>
    </a>
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

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>{t.work.moreLabel}</h3>
        </div>
      </Reveal>

      {/* .stagger must sit on the .reveal element itself — is-visible lands
          there, and the child-fade selectors key off the pair. */}
      <Reveal className="mini-grid stagger">
        {MORE.map((project, index) => (
          <MiniCard
            key={project.name}
            project={project}
            copy={t.work.more[index]}
          />
        ))}
      </Reveal>
    </section>
  )
}
