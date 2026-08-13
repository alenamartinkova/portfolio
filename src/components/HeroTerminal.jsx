import { useEffect, useRef, useState } from 'react'
import './HeroTerminal.css'

const EMAIL = 'martinkova.a@gmail.com'

const focus = [
  'Architecting distributed Python microservices and data pipelines',
  'Driving platform evolution and real-time features',
  'Working in cross-functional collaboration across product, design and engineering',
]

const stack = [
  'Python · FastAPI',
  'PostgreSQL · SQLAlchemy',
  'Redis · RabbitMQ',
  'React · Vue',
  'Docker · Kubernetes',
  'PyTest · Cypress',
]

const OUTPUTS = {
  whoami: (
    <dl className="term__spec">
      <div>
        <dt>status</dt>
        <dd>
          <span className="status-dot" />
          Currently: Backend Lead @ Rankacy
        </dd>
      </div>
      <div>
        <dt>location</dt>
        <dd>Based in Ostrava · remote-friendly</dd>
      </div>
      <div>
        <dt>email</dt>
        <dd>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </dd>
      </div>
    </dl>
  ),
  focus: (
    <ul className="term__list">
      {focus.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ),
  stack: (
    <ul className="term__list term__list--tight">
      {stack.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ),
  contact: (
    <ul className="term__links">
      <li>
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </li>
      <li>
        <a
          href="https://www.linkedin.com/in/alena-martinkova/"
          target="_blank"
          rel="noreferrer"
        >
          linkedin.com/in/alena-martinkova
        </a>
      </li>
      <li>
        <a
          href="https://github.com/alenamartinkova"
          target="_blank"
          rel="noreferrer"
        >
          github.com/alenamartinkova
        </a>
      </li>
    </ul>
  ),
}

const COMMANDS = Object.keys(OUTPUTS)

export default function HeroTerminal() {
  const [history, setHistory] = useState([{ cmd: 'whoami', id: 0 }])
  const [flash, setFlash] = useState(null)
  const nextId = useRef(1)
  const bodyRef = useRef(null)

  // Keep the newest line in view without scrolling the page itself.
  useEffect(() => {
    const body = bodyRef.current
    if (body) body.scrollTop = body.scrollHeight
  }, [history])

  useEffect(() => {
    if (flash === null) return
    const timeout = setTimeout(() => setFlash(null), 1200)
    return () => clearTimeout(timeout)
  }, [flash])

  const run = cmd => {
    if (cmd === 'clear') {
      setHistory([])
      setFlash(null)
      return
    }

    const existing = history.find(entry => entry.cmd === cmd)

    // Already on screen — point at it instead of printing a duplicate.
    if (existing) {
      const body = bodyRef.current
      const target = body?.querySelector(`[data-entry="${existing.id}"]`)
      if (body && target) body.scrollTop = target.offsetTop - 12
      setFlash(existing.id)
      return
    }

    setHistory(current => [...current, { cmd, id: nextId.current++ }])
  }

  return (
    <div className="term panel">
      <div className="panel__chrome">
        <span className="panel__chrome-dot panel__chrome-dot--accent" />
        alena@martinkova.dev — zsh
      </div>

      <div className="term__body" ref={bodyRef} aria-live="polite">
        {history.map(entry => (
          <div
            className={`term__entry${flash === entry.id ? ' is-flash' : ''}`}
            data-entry={entry.id}
            key={entry.id}
          >
            <p className="term__prompt">
              <span>$</span> {entry.cmd}
            </p>
            <div className="term__output">{OUTPUTS[entry.cmd]}</div>
          </div>
        ))}

        <p className="term__prompt term__prompt--live">
          <span>$</span>
          <i className="term__caret" aria-hidden="true" />
        </p>
      </div>

      <div className="term__commands">
        {COMMANDS.map(cmd => (
          <button
            key={cmd}
            type="button"
            className="term__command"
            onClick={() => run(cmd)}
          >
            {cmd}
          </button>
        ))}
        <button
          type="button"
          className="term__command term__command--muted"
          onClick={() => run('clear')}
        >
          clear
        </button>
      </div>
    </div>
  )
}
