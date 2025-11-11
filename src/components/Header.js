import './Header.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLinkedin, faGithub } from '@fortawesome/free-brands-svg-icons'
import { faMapMarkerAlt, faEnvelope } from '@fortawesome/free-solid-svg-icons'

const highlights = [
  'Architecting distributed Python microservices and data pipelines',
  'Driving platform evolution and real-time features',
  'Working in cross-functional collaboration across product, design and engineering',
]

export default function Header() {
  return (
    <header id="header">
      <div className="hero__grid">
        <div className="hero__intro">
          <p className="eyebrow eyebrow--accent">
            Full stack · Product-led engineering
          </p>
          <h1>
            Alena Martinková
            <span>Engineer & backend tech lead</span>
          </h1>
          <p className="hero__lead">
            I build scalable platforms and data-driven products. My focus is on
            designing resilient backend architectures, leading engineering
            teams, and partnering closely with design & product to deliver fast,
            measurable, high-quality experiences.
          </p>

          <div className="hero__meta">
            <span>
              <FontAwesomeIcon icon={faMapMarkerAlt} /> Based in Ostrava ·
              remote-friendly
            </span>
            <span>
              <FontAwesomeIcon icon={faEnvelope} /> martinkova.a@gmail.com
            </span>
          </div>

          <div className="hero__actions">
            <a href="mailto:martinkova.a@gmail.com" className="button-primary">
              Contact me!
            </a>
            <a href="#projects" className="button-secondary">
              See recent work
            </a>
          </div>

          <div className="hero__social">
            <a
              href="https://www.linkedin.com/in/alena-martinkova/"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faLinkedin} />
              LinkedIn
            </a>
            <a
              href="https://github.com/alenamartinkova"
              target="_blank"
              rel="noreferrer"
            >
              <FontAwesomeIcon icon={faGithub} />
              GitHub
            </a>
          </div>
        </div>

        <div className="hero__panel">
          <span className="hero__badge">Currently: Backend Lead @ Rankacy</span>
          <ul className="hero__highlights">
            {highlights.map(highlight => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  )
}
