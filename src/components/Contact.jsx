import './Contact.css'
import { Check, Copy, Mail } from 'lucide-react'
import { FaLinkedinIn } from 'react-icons/fa6'
import Reveal from './Reveal'
import { useCopy } from '../hooks'

const EMAIL = 'martinkova.a@gmail.com'

export default function Contact() {
  const [copied, copy] = useCopy(EMAIL)

  return (
    <section className="section shell" id="contact">
      <Reveal className="contact panel">
        <div className="panel__chrome">
          <span className="panel__chrome-dot panel__chrome-dot--accent" />
          contact.sh
        </div>

        <div className="contact__body">
          <div className="contact__copy">
            <p className="section__index">
              <b>05</b> / contact
            </p>
            <h3>Need a product-minded engineer or fractional tech lead?</h3>
            <p className="contact__note">Send a note and let’s meet up.</p>

            <button
              type="button"
              className="contact__email"
              onClick={copy}
              aria-label={copied ? 'Email address copied' : `Copy ${EMAIL}`}
            >
              <span>{EMAIL}</span>
              {copied ? (
                <Check className="contact__email-icon is-ok" aria-hidden="true" />
              ) : (
                <Copy className="contact__email-icon" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="contact__actions">
            <a className="button-primary" href={`mailto:${EMAIL}`}>
              <Mail aria-hidden="true" />
              Email me
            </a>
            <a
              className="button-secondary"
              href="https://www.linkedin.com/in/alena-martinkova/"
              target="_blank"
              rel="noreferrer"
            >
              <FaLinkedinIn aria-hidden="true" />
              Connect on LinkedIn
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
