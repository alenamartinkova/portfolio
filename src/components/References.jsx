import './References.css'
import { ArrowUpRight } from 'lucide-react'
import Reveal from './Reveal'

const projects = [
  {
    name: 'Rankacy',
    type: 'E-sports analytics platform',
    summary:
      'Build the competitive gaming backend that powers CS2 player insights, match processing, and subscription revenue.',
    highlights: [
      'Event-driven FastAPI services processing match data at scale',
      'Subscription system and Stripe billing flows',
    ],
    link: 'https://www.rankacy.com',
    linkLabel: 'View platform',
    stack: 'FastAPI · PostgreSQL · Redis · RabbitMQ · Stripe · AWS',
  },
  {
    name: 'Moravio',
    type: 'External software & internal tools',
    summary:
      'Built features and internal tools for international client projects, ranging from booking engines to business dashboards.',
    highlights: [
      'Delivered backend & full-stack features across multiple products',
      'Collaborated with designers and PMs to ship clean, production-ready solutions',
    ],
    link: 'https://moravio.com',
    linkLabel: 'See agency',
    stack: 'React · PHP · WordPress · MySQL · Docker',
  },
  {
    name: 'SVX',
    type: 'E-commerce & ERP-connected systems',
    summary:
      'Built modern e-commerce backend with dynamic pricing, multilingual content, delivery integrations, and internal admin tooling.',
    highlights: [
      'Integrated logistics, shipping, and payment APIs without downtime',
      'Implemented internal administration panel for order & product management',
    ],
    link: 'https://www.svx.cz',
    linkLabel: 'Visit site',
    stack: 'FastAPI · PostgreSQL · React · Payment & shipping APIs',
  },
]

const clients = [
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
  return (
    <section className="section shell" id="projects">
      <Reveal className="section__header">
        <p className="section__index">
          <b>04</b> / work
        </p>
        <h2>Partnerships built on trust, delivery, and measurable impact</h2>
        <p className="section__description">
          I collaborate with founders, agencies, and in-house teams to move from
          idea to scalable launch—and stick around to iterate.
        </p>
      </Reveal>

      <Reveal className="projects-grid">
        {projects.map(project => (
          <article className="project-card panel panel--hover" key={project.name}>
            <div className="panel__chrome">
              <span className="panel__chrome-dot" />
              {project.type}
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
                  {project.linkLabel}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>

              <p className="project-card__summary">{project.summary}</p>

              <ul className="project-card__highlights">
                {project.highlights.map(item => (
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
        ))}
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>Clients &amp; teams</h3>
        </div>
        <ul className="client-grid">
          {clients.map(client => (
            <li className="client-grid__cell" key={client}>
              {client}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
