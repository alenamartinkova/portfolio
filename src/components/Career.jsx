import { useState } from 'react'
import './Career.css'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Locale-invariant: tags read as tech keywords, so they are the same in every
// locale. Merged with the translated entries by index.
const TAGS = [
  ['Python', 'FastAPI', 'AWS', 'Team leadership'],
  ['React', 'GraphQL'],
  ['Full stack', 'Client delivery', 'Leadership'],
  ['Laravel', 'React', 'WordPress', 'CI/CD'],
  ['Python', 'Blockchain'],
]

// Indices of still-running entries. An explicit list rather than matching on
// the period string — "present" does not survive translation.
const ONGOING = new Set([0, 2])

const LINKEDIN = 'https://www.linkedin.com/in/alena-martinkova/'

function TimelineEntry({ item, tags, current, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

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
          <div className="chip-row">
            {tags.map(tag => (
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

export default function Career() {
  const t = useT()

  return (
    <section className="section shell" id="journey">
      <Reveal className="section__header">
        <p className="section__index">
          <b>04</b> / {t.career.index}
        </p>
        <h2>{t.career.title}</h2>
        <p className="section__description">{t.career.description}</p>
      </Reveal>

      <Reveal>
        <ol className="timeline">
          {t.career.items.map((item, index) => (
            // The newest entry starts open so the section never reads as empty.
            <TimelineEntry
              key={item.title}
              item={item}
              tags={TAGS[index]}
              current={ONGOING.has(index)}
              defaultOpen={index === 0}
            />
          ))}
        </ol>

        <a
          href={LINKEDIN}
          target="_blank"
          rel="noreferrer"
          className="link-arrow timeline__more"
        >
          {t.career.linkedin}
          <ArrowUpRight aria-hidden="true" />
        </a>
      </Reveal>
    </section>
  )
}
