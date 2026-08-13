import './Header.css'
import { ArrowDown, Mail } from 'lucide-react'
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6'

const focus = [
  'Architecting distributed Python microservices and data pipelines',
  'Driving platform evolution and real-time features',
  'Working in cross-functional collaboration across product, design and engineering',
]

export default function Header() {
  return (
    <header id="top" className="hero">
      <div className="shell hero__grid">
        <div className="hero__intro">
          <p className="hero__eyebrow">
            Full stack · Product-led engineering
          </p>

          <h1 className="hero__title">
            Alena Martinková
            <span>Engineer &amp; backend tech lead</span>
          </h1>

          <p className="hero__lead">
            I build scalable platforms and data-driven products. My focus is on
            designing resilient backend architectures, leading engineering
            teams, and partnering closely with design &amp; product to deliver
            fast, measurable, high-quality experiences.
          </p>

          <div className="hero__actions">
            <a href="#contact" className="button-primary">
              <Mail aria-hidden="true" />
              Contact me!
            </a>
            <a href="#projects" className="button-secondary">
              <ArrowDown aria-hidden="true" />
              See recent work
            </a>
          </div>

          <div className="hero__social">
            <a
              href="https://www.linkedin.com/in/alena-martinkova/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedinIn aria-hidden="true" />
              LinkedIn
            </a>
            <a
              href="https://github.com/alenamartinkova"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <FaGithub aria-hidden="true" />
              GitHub
            </a>
          </div>
        </div>

        <div className="hero__spec panel">
          <div className="panel__chrome">
            <span className="panel__chrome-dot panel__chrome-dot--accent" />
            profile.yaml
          </div>

          <dl className="spec">
            <div className="spec__row">
              <dt>status</dt>
              <dd>
                <span className="status-dot" />
                Currently: Backend Lead @ Rankacy
              </dd>
            </div>
            <div className="spec__row">
              <dt>location</dt>
              <dd>Based in Ostrava · remote-friendly</dd>
            </div>
            <div className="spec__row">
              <dt>email</dt>
              <dd>
                <a href="mailto:martinkova.a@gmail.com">
                  martinkova.a@gmail.com
                </a>
              </dd>
            </div>
          </dl>

          <div className="spec__focus">
            <p className="spec__focus-key">focus:</p>
            <ul>
              {focus.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}
