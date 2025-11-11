import React from 'react'

const skillGroups = [
  {
    title: 'Backend & platform engineering',
    description:
      'Designing and scaling backend systems that stay fast, predictable, and understandable as they grow.',
    items: [
      'Python · FastAPI ',
      'PostgreSQL · SQLAlchemy',
      'Redis · RabbitMQ',
      'API design',
    ],
  },
  {
    title: 'Web product development',
    description: 'Building usable, performant products — not just endpoints.',
    items: [
      'React & modern frontend fundamentals',
      'State, routing, forms & real-time UI updates',
      'Smooth collaboration',
      'Accessibility & performance awareness',
    ],
  },
  {
    title: 'Deployment, testing & reliability',
    description:
      'I like systems that don’t break at 2 am. Or worse — during a Friday release.',
    items: [
      'CI/CD pipelines',
      'Dockerized services · Kubernetes',
      'PyTest & integration testing',
      'Metrics & logging best-effort',
    ],
  },
]

export default function Skills() {
  return (
    <section className="section" id="skills">
      <div className="section__header">
        <p className="eyebrow">Capabilities</p>
        <h2>Systems thinking, clean architecture, and practical delivery</h2>
        <p className="section__description">
          I like taking complex ideas and turning them into clear, scalable
          systems. My work sits at the intersection of engineering, product
          clarity, and thoughtful user experience. I care about correctness,
          maintainability, and making sure teams ship with confidence — not
          chaos.
        </p>
      </div>

      <div className="skills-grid">
        {skillGroups.map(group => (
          <article className="skill-card" key={group.title}>
            <h3>{group.title}</h3>
            <p>{group.description}</p>
            <ul>
              {group.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
