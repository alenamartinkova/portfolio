import { useState } from 'react'
import './Education.css'
import { ChevronDown } from 'lucide-react'
import Reveal from './Reveal'

// Ordered strictly by start date, newest first — the previous order jumped
// around (a 2019 role sat between 2022 and 2023 entries).
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
    period: 'Jul 2023 — Jan 2024',
    title: 'Frontend Developer · GIMMEDATA',
    description:
      'Delivered modern front-end applications with Vue.js, HTML, CSS, and GraphQL while collaborating remotely across product and QA.',
    tags: ['Vue', 'GraphQL', 'Remote'],
  },
  {
    period: 'Jan 2022 — Present',
    title: 'Full Stack Lead Developer · WAPS Technologies (Freelance)',
    description:
      'Lead Laravel + React deliveries for hybrid client projects, balancing architecture decisions with hands-on implementation across the stack.',
    tags: ['PHP', 'React', 'Leadership'],
  },
  {
    period: 'Jul 2020 — Jul 2023',
    title: 'Full Stack Developer · Moravio',
    description:
      'Developed Laravel/Node backends with React/Strapi frontends, owned CI/CD, testing (Cypress + PHP Unit), and presented releases directly to clients.',
    tags: ['Laravel', 'React', 'CI/CD'],
  },
  {
    period: 'Jan 2019 — Present',
    title: 'Full Stack Developer · Self-employed',
    description:
      'Built static and dynamic sites, complex booking portals, and e-shops. Owned planning, client comms, Cypress/PHPUnit testing, and both FE/BE implementation.',
    tags: ['Scrum/Kanban', 'Cypress', 'Client delivery'],
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

function TimelineEntry({ item, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const current = item.period.includes('Present')

  return (
    <li
      className={[
        'timeline__item',
        current ? 'timeline__item--current' : '',
        open ? 'is-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="timeline__node" aria-hidden="true" />

      <div className="timeline__body">
        <button
          type="button"
          className="timeline__summary"
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          <span className="timeline__period">
            {item.period}
            {current && <span className="status-dot" />}
          </span>
          <span className="timeline__title">{item.title}</span>
          <ChevronDown className="timeline__chevron" aria-hidden="true" />
        </button>

        <div className="timeline__detail" hidden={!open}>
          <p className="timeline__description">{item.description}</p>
          {item.details?.length > 0 && (
            <ul className="timeline__points">
              {item.details.map(point => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          )}
          <div className="chip-row">
            {item.tags.map(tag => (
              <span className="chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </li>
  )
}

function Timeline({ items }) {
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        // The newest entry starts open so the section never reads as empty.
        <TimelineEntry key={item.title} item={item} defaultOpen={index === 0} />
      ))}
    </ol>
  )
}

export default function Education() {
  return (
    <section className="section shell" id="journey">
      <Reveal className="section__header">
        <p className="section__index">
          <b>03</b> / journey
        </p>
        <h2>Experience &amp; education milestones</h2>
        <p className="section__description">
          Every role sharpened a different muscle—architecture, velocity,
          empathy, or leadership. Together they help me build products that
          scale gracefully.
        </p>
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>Roles that shaped my skills</h3>
        </div>
        <Timeline items={experience} />
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>Academic foundation</h3>
        </div>
        <Timeline items={education} />
      </Reveal>
    </section>
  )
}
