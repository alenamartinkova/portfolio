import React from 'react'

const stats = [
  { value: '6+', label: 'Years shipping digital products' },
  {
    value: '12+',
    label: 'Production services & web apps delivered end-to-end',
  },
  { value: '2', label: 'Cross-functional teams led' },
]

export default function AboutMe() {
  return (
    <section className="section" id="about">
      <div className="section__header">
        <p className="eyebrow">About</p>
        <h2>
          Backend engineer with a product mindset and focus on clean, reliable
          systems
        </h2>
        <p className="section__description">
          🚀 I’m a backend-leaning full-stack developer who builds fast,
          reliable web platforms. Since 2019 I’ve shipped everything from
          e-commerce and booking systems to internal tools and real-time data
          products—currently leading backend at Rankacy, previously at Moravio
          and GIMMEDATA. I partner closely with design and product so each
          release is cohesive, measurable, and performant.
        </p>
      </div>

      <div className="about__content">
        <div className="about__copy">
          <p>
            🛠 My go-to stack is Python (FastAPI), PostgreSQL, Redis, RabbitMQ,
            React. I care about clean architecture, efficient solutions,
            observability, and proper testing (PyTest, Cypress).
          </p>
          <p>
            🤝 I enjoy leading teams, mentoring engineers, and keeping delivery
            calm and predictable. Outside the code, I like getting involved in
            the creative side—anything that improves the user experience.
          </p>
        </div>

        <div className="about__spotlight">
          <img src="images/me.jpg" alt="Alena Martinková" loading="lazy" />
          <span className="spotlight__badge spotlight__badge--alt">
            Currently building at Rankacy
          </span>
        </div>
      </div>

      <div className="about__extras">
        <div className="stat-grid">
          {stats.map(stat => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.value}</span>
              <p>{stat.label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
