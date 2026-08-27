import './Contact.css'
import { Check, Copy, Mail } from 'lucide-react'
import { FaLinkedinIn } from 'react-icons/fa6'
import { useT } from '../i18n'
import Reveal from './Reveal'
import { useCopy } from '../hooks'

const EMAIL = 'martinkova.a@gmail.com'

export default function Contact() {
  const t = useT()
  const [copied, copy] = useCopy(EMAIL)

  return (
    <section className="section shell" id="contact">
      <Reveal className="section__header contact__header">
        <p className="section__index">
          <b>04</b> / {t.contact.index}
        </p>
      </Reveal>

      <Reveal className="contact panel">
        <div className="panel__chrome">
          <span className="panel__chrome-dot panel__chrome-dot--accent" />
          contact.sh
        </div>

        <div className="contact__body">
          {/* The heading and the note live inside the panel — the section
              header outside is reduced to its number. */}
          <div className="contact__intro">
            <h2>{t.contact.title}</h2>
            <p className="contact__note">{t.contact.note}</p>
          </div>

          <div className="contact__row">
            <button
              type="button"
              className="contact__email"
              onClick={copy}
              aria-label={
                copied ? t.contact.copied : `${t.contact.copy} ${EMAIL}`
              }
            >
              <span>{EMAIL}</span>
              {copied ? (
                <Check
                  className="contact__email-icon is-ok"
                  aria-hidden="true"
                />
              ) : (
                <Copy className="contact__email-icon" aria-hidden="true" />
              )}
            </button>

            <div className="contact__actions">
              <a className="button-primary" href={`mailto:${EMAIL}`}>
                <Mail aria-hidden="true" />
                {t.contact.ctaEmail}
              </a>
              <a
                className="button-secondary"
                href="https://www.linkedin.com/in/alena-martinkova/"
                target="_blank"
                rel="noreferrer"
              >
                <FaLinkedinIn aria-hidden="true" />
                {t.contact.ctaLinkedIn}
              </a>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
