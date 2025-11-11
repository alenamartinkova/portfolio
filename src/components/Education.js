import React from 'react'

const experience = [
  {
    period: 'Mar 2024 — Present',
    title: 'Backend Lead Developer · Rankacy',
    description:
      'Oversee an e-sports software team, guide solution design end to end, and keep daily delivery running — from API architecture to implementation reviews.',
    tags: ['Python', 'Team leadership', 'E-sports'],
  },
  {
    period: 'Jan 2024 — Mar 2024',
    title: 'Full Stack Developer · Rankacy',
    description:
      'Handled both the backend API and front-end application during the early Rankacy build, providing diagrams, database architecture, and Jira-ready specs.',
    tags: ['Django', 'Python', 'Client comms'],
  },
  {
    period: 'Jan 2022 — Present',
    title: 'Full Stack Lead Developer · WAPS Technologies (Freelance)',
    description:
      'Lead Laravel + React deliveries for hybrid client projects, balancing architecture decisions with hands-on implementation across the stack.',
    tags: ['PHP', 'React', 'Leadership'],
  },
  {
    period: 'Jan 2019 — Present',
    title: 'Full Stack Developer · Self-employed',
    description:
      'Built static and dynamic sites, complex booking portals, and e-shops. Owned planning, client comms, Cypress/PHPUnit testing, and both FE/BE implementation.',
    tags: ['Scrum/Kanban', 'Cypress', 'Client delivery'],
  },
  {
    period: 'Jul 2023 — Jan 2024',
    title: 'Frontend Developer · GIMMEDATA',
    description:
      'Delivered modern front-end applications with Vue.js, HTML, CSS, and GraphQL while collaborating remotely across product and QA.',
    tags: ['Vue', 'GraphQL', 'Remote'],
  },
  {
    period: 'Jul 2020 — Jul 2023',
    title: 'Full Stack Developer · Moravio',
    description:
      'Developed Laravel/Node backends with React/Strapi frontends, owned CI/CD, testing (Cypress + PHP Unit), and presented releases directly to clients.',
    tags: ['Laravel', 'React', 'CI/CD'],
  },
  {
    period: '2019 — 2020',
    title: 'Frontend Web Developer · Moravio',
    description:
      'Built Vue, HTML, CSS, and WordPress projects while supporting helpdesk workstreams, testing, and agile ceremonies.',
    tags: ['Vue', 'WordPress', 'Cypress'],
  },
]

const education = [
  {
    period: 'Sep 2021 — Jun 2024',
    title: "Master's Degree · VSB - Technical University of Ostrava",
    description:
      'Master thesis focused on blockchain; implemented a custom blockchain framework in Python.',
    tags: ['Blockchain', 'Python', 'Research'],
  },
  {
    period: '2018 — 2021',
    title: "Bachelor's Degree · VSB - Technical University of Ostrava",
    description:
      'Information Technology program with strong foundation in software engineering fundamentals.',
    tags: ['PHP', 'Databases', 'Software engineering'],
  },
]

export default function Education() {
  return (
    <section className="section" id="journey">
      <div className="section__header">
        <p className="eyebrow">Journey</p>
        <h2>Experience & education milestones</h2>
        <p className="section__description">
          Every role sharpened a different muscle—architecture, velocity,
          empathy, or leadership. Together they help me build products that
          scale gracefully.
        </p>
      </div>

      <div className="section__group">
        <div className="section__subheader">
          <p className="eyebrow">Experience</p>
          <h3>Roles that shaped my skills</h3>
        </div>

        <div className="timeline">
          {experience.map(item => (
            <article className="timeline__item" key={item.title}>
              <span className="timeline__period">{item.period}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="tag-list">
                {item.tags.map(tag => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="section__group">
        <div className="section__subheader">
          <p className="eyebrow">Education</p>
          <h3>Academic foundation</h3>
        </div>

        <div className="education-grid">
          {education.map(item => (
            <article className="education-card" key={item.title}>
              <span className="timeline__period">{item.period}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <div className="tag-list">
                {item.tags.map(tag => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
