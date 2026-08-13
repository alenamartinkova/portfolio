import './App.css'
import Nav from './components/Nav'
import Header from './components/Header'
import AboutMe from './components/AboutMe'
import Skills from './components/Skills'
import Education from './components/Education'
import References from './components/References'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
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
