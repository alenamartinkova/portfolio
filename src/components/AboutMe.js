import React from 'react'
import { AnimationOnScroll } from 'react-animation-on-scroll'

export default function AboutMe() {
    return (
        <section className="section" id="about-me">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>👋 About me</h1>

                    <p>
                        🚀 Hey there! I'm a passionate Full Stack Developer with a knack for transforming ideas into digital realities. Since 2019, I've been delving into the tech world, currently working at Rankacy and previously at Moravio and GIMMEDATA, s.r.o.
                    </p>

                    <p>
                        🌐 My journey has been all about building web applications that are not just functional but also a delight to use. I've managed multiple projects, from sleek static pages to dynamic e-shops and intricate online booking platforms. My tools? A mix of Python, Django, FastAPI, React, and Laravel for the most part, sprinkled with some frontend magic using technologies like Vue.js and Strapi.
                    </p>
                    <p>
                        🔍 What drives me? The challenge of creating fast, efficient algorithms and crafting user-centric designs. I love tinkering with codes to make them cleaner and more readable, thanks to my buddies eslint and prettier. And yes, I'm a testing enthusiast, as I am ensuring everything runs smoothly.
                    </p>
                    <p>
                        🤝 Collaboration is key in my book. I thrive in environments where I can bounce ideas off teammates, communicate directly with clients, and use tools like JIRA to keep everything on track. Whether it's Scrum or Kanban, I'm all about agile development and efficient project management.
                    </p>
                    <p>
                        🌟 Looking forward to connecting with like-minded tech enthusiasts, sharing ideas, and exploring new opportunities in this ever-evolving digital landscape!
                    </p>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
