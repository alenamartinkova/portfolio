import React from 'react'
import { AnimationOnScroll } from 'react-animation-on-scroll'

export default function AboutMe() {
  return (
    <section className="section" id="about-me">
      <div className={'content'}>
        <AnimationOnScroll animateIn="animate__fadeInRight">
          <h1>👋 About me</h1>

          <p>
            🚀 Hey there! I’m a Full Stack Developer who’s been bringing ideas
            to life since 2019. Right now, I’m at Rankacy, and before that, I
            was part of the teams at Moravio and GIMMEDATA, s.r.o. I’m all about
            building web apps that aren’t just functional but also genuinely
            enjoyable to use. From sleek static pages to dynamic e-shops and
            complex booking platforms, I’ve had my hands in a bit of everything.
          </p>

          <p>
            🌐 My main tools are Python, FastAPI, React, and Laravel, but I’ve
            also dabbled with Vue.js and Strapi when I need to mix things up on
            the frontend. I’m into fast, efficient algorithms and love writing
            clean, readable code – eslint and prettier are basically my best
            friends. Plus, I’m pretty big on testing, whether it’s with Cypress,
            PHP Unit or PyTest, because solid code should never be a gamble.
          </p>
          <p>
            🤝 One thing I really value is collaboration. I thrive on bouncing
            ideas off teammates, working closely with clients, and keeping
            everything organized with JIRA. Whether it’s Scrum or Kanban, agile
            development just makes sense to me. I’ve also led a few teams,
            helping shape both the planning and the actual development process.
          </p>
          <p>
            🌟 Outside of coding, I like to get involved in the creative side of
            things too – from making design decisions to just figuring out how
            to make the user experience smoother. I’m always down to connect
            with other tech folks, share ideas, and see where the next challenge
            takes me!
          </p>
        </AnimationOnScroll>
      </div>
    </section>
  )
}
