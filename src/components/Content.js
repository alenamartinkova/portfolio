import React from 'react'
import Me from "./Me"
import AboutMe from "./AboutMe"
import Education from "./Education"
import Skills from "./Skills"
import References from "./References"
export default function Content () {
    return (
        <main className={'main'}>
            <Me />
            <AboutMe />
            <Education />
            <Skills />
            <References />
        </main>
    )
}