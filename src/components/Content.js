import React from 'react'
import AboutMe from './AboutMe'
import Education from './Education'
import Skills from './Skills'
import References from './References'

export default function Content() {
  return (
    <main className="page">
      <AboutMe />
      <Education />
      <Skills />
      <References />
    </main>
  )
}
