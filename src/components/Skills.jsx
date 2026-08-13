import './Skills.css'
import Reveal from './Reveal'
import StackDiagram from './StackDiagram'

const skillGroups = [
  {
    file: 'backend.py',
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
    file: 'product.tsx',
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
    file: 'delivery.yml',
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
    <section className="section shell" id="skills">
      <Reveal className="section__header">
        <p className="section__index">
          <b>02</b> / stack
        </p>
        <h2>Systems thinking, clean architecture, and practical delivery</h2>
        <p className="section__description">
          I like taking complex ideas and turning them into clear, scalable
          systems. My work sits at the intersection of engineering, product
          clarity, and thoughtful user experience. I care about correctness,
          maintainability, and making sure teams ship with confidence — not
          chaos.
        </p>
      </Reveal>

      <Reveal>
        <StackDiagram />
      </Reveal>

      <Reveal className="skills-grid">
        {skillGroups.map(group => (
          <article
            className="skill-card panel panel--hover"
            key={group.title}
          >
            <div className="panel__chrome">
              <span className="panel__chrome-dot" />
              {group.file}
            </div>

            <div className="panel__body">
              <h3>{group.title}</h3>
              <p className="skill-card__description">{group.description}</p>

              <ul className="skill-card__list">
                {group.items.map((item, index) => (
                  <li key={item}>
                    <span className="skill-card__index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.trim()}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </Reveal>
    </section>
  )
}
