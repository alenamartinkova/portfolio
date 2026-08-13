import { useState } from 'react'
import './Education.css'
import { ChevronDown } from 'lucide-react'
import { useT } from '../i18n'
import Reveal from './Reveal'

// Indices of still-running roles. An explicit list rather than matching on the
// period string — "Present" does not survive translation.
const ONGOING = new Set([0, 3, 5])

function TimelineEntry({ item, current, defaultOpen }) {
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

function Timeline({ items, ongoing }) {
  return (
    <ol className="timeline">
      {items.map((item, index) => (
        // The newest entry starts open so the section never reads as empty.
        <TimelineEntry
          key={item.title}
          item={item}
          current={ongoing?.has(index) ?? false}
          defaultOpen={index === 0}
        />
      ))}
    </ol>
  )
}

export default function Education() {
  const t = useT()

  return (
    <section className="section shell" id="journey">
      <Reveal className="section__header">
        <p className="section__index">
          <b>03</b> / {t.journey.index}
        </p>
        <h2>{t.journey.title}</h2>
        <p className="section__description">{t.journey.description}</p>
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>{t.journey.experienceLabel}</h3>
        </div>
        <Timeline items={t.journey.experience} ongoing={ONGOING} />
      </Reveal>

      <Reveal className="section__group">
        <div className="section__subheader">
          <h3>{t.journey.educationLabel}</h3>
        </div>
        <Timeline items={t.journey.education} />
      </Reveal>
    </section>
  )
}
