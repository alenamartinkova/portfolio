import React from 'react'
import { AnimationOnScroll } from 'react-animation-on-scroll'

export default function AboutMe() {
    return (
        <section className="section" id="about-me">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>👋 About me</h1>

                    <p>
                    Hi there! My name is Alena, and I'm a web programmer with a passion for creating innovative digital solutions.
                    I'm 24 years old and other then web development I am interested in gaming, sports and building LEGO!
                    </p>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
