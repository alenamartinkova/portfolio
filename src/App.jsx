import './App.css'
import { LocaleProvider, useT } from './i18n'
import Nav from './components/Nav'
import Header from './components/Header'
import AboutMe from './components/AboutMe'
import Skills from './components/Skills'
import Education from './components/Education'
import References from './components/References'
import Contact from './components/Contact'
import Footer from './components/Footer'

function Page() {
  const t = useT()

  return (
    <>
      <a className="skip-link" href="#main">
        {t.nav.skip}
      </a>

      <Nav />
      <Header />

      <main className="page" id="main">
        <AboutMe />
        <Skills />
        <Education />
        <References />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

export default function App() {
  return (
    <LocaleProvider>
      <Page />
    </LocaleProvider>
  )
}
