import './Footer.css'
import { ArrowUp } from 'lucide-react'
import { useT } from '../i18n'
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6'

export default function Footer() {
  const t = useT()

  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <p className="footer__mark">
          <span className="footer__monogram">
            <span>[</span>AM<span>]</span>
          </span>
          <span className="footer__copy">
            © {new Date().getFullYear()} Alena Martinková
          </span>
        </p>

        <div className="footer__links">
          <a
            href="https://github.com/alenamartinkova"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub aria-hidden="true" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/alena-martinkova/"
            target="_blank"
            rel="noreferrer"
          >
            <FaLinkedinIn aria-hidden="true" />
            LinkedIn
          </a>
          <a href="#top" className="footer__top">
            <ArrowUp aria-hidden="true" />
            {t.footer.top}
          </a>
        </div>
      </div>
    </footer>
  )
}
