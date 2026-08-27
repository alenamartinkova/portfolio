import './Skills.css'
import { useT } from '../i18n'
import Reveal from './Reveal'
import StackDiagram from './StackDiagram'

// Panel file names read as code, so they are the same in every locale.
const FILES = ['backend.py', 'product.tsx', 'delivery.yml', 'leading.md']

export default function Skills() {
  const t = useT()

  return (
    <section className="section shell" id="skills">
      <Reveal className="section__header">
        <p className="section__index">
          <b>02</b> / {t.skills.index}
        </p>
        <h2>{t.skills.title}</h2>
        <p className="section__description">{t.skills.description}</p>
      </Reveal>

      <Reveal>
        <StackDiagram />
      </Reveal>

      <Reveal className="skills-grid stagger">
        {t.skills.groups.map((group, index) => (
          <article className="skill-card panel panel--hover" key={group.title}>
            <div className="panel__chrome">
              <span className="panel__chrome-dot" />
              {FILES[index]}
            </div>

            <div className="panel__body">
              <h3>{group.title}</h3>
              <p className="skill-card__description">{group.description}</p>

              <ul className="skill-card__list">
                {group.items.map((item, itemIndex) => (
                  <li key={item}>
                    <span className="skill-card__index">
                      {String(itemIndex + 1).padStart(2, '0')}
                    </span>
                    {item}
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
