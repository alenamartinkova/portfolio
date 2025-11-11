import React from 'react'

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
      '	Collaborated with designers and PMs to ship clean, production-ready solutions',
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
    <section className="section" id="projects">
      <div className="section__header">
        <p className="eyebrow">Selected work</p>
        <h2>Partnerships built on trust, delivery, and measurable impact</h2>
        <p className="section__description">
          I collaborate with founders, agencies, and in-house teams to move from
          idea to scalable launch—and stick around to iterate.
        </p>
      </div>

      <div className="projects-grid">
        {projects.map(project => (
          <article className="project-card" key={project.name}>
            <div className="project-card__header">
              <p className="eyebrow eyebrow--muted">{project.type}</p>
              <div className="project-card__title">
                <h3>{project.name}</h3>
                <a
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  className="project-pill-link project-pill-link--accent"
                >
                  {project.linkLabel}
                </a>
              </div>
            </div>
            <p className="project-card__summary">{project.summary}</p>
            <ul className="project-card__highlights">
              {project.highlights.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="project-card__meta">
              <span>{project.stack}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="client-strip">
        {clients.map(client => (
          <span key={client}>{client}</span>
        ))}
      </div>

      <div className="contact-card" id="contact">
        <div>
          <p className="eyebrow">Let’s build something</p>
          <h3>Need a product-minded engineer or fractional tech lead?</h3>
          <p>Send a note and let’s meet up.</p>
        </div>
        <div className="contact-card__actions">
          <a className="button-primary" href="mailto:martinkova.a@gmail.com">
            Email me
          </a>
          <a
            className="button-secondary"
            href="https://www.linkedin.com/in/alena-martinkova/"
            target="_blank"
            rel="noreferrer"
          >
            Connect on LinkedIn
          </a>
        </div>
      </div>
    </section>
  )
}
