import React from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll";

export default function Education() {
    return (
        <section className="section" id="education">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>📚 Education</h1>
                    <strong>
                        🎓 Bachelor's Degree in Information Technology
                    </strong>
                    <p>
                        🚀 My launchpad into IT. This is where it all started! Those sleepless nights and endless cups of coffee paid off with a shiny 'A' grade. I got my hands dirty with JSON, SASS, Git, PHP, JavaScript, and Python. It was more than just learning; it was about experimenting, failing, and learning some more.
                    </p>
                    <p>
                        🤓 Beyond the grades, it was the hands-on projects and teamwork that really made the difference. Every line of code was a step closer to becoming the developer I am today.
                    </p>

                    <strong>
                        🎓 Master's Degree in Information Technology
                    </strong>
                    <p>
                        👨‍💻 Stepping up my game in the world of IT with a Master's! Here, I'm diving deeper into the
                        complexities of JavaScript Frameworks and Software Engineering Practices. It's all about
                        fine-tuning my skills in JSON, SASS, GitHub, and Python. The journey is intense, but hey, who
                        doesn't love a good challenge?
                    </p>
                    <p>
                        🔍 What's it like? Picture this: endless lines of code, hours of debugging, and that sweet moment
                        when everything finally clicks. It's not just about getting the grades (though I'm nailing that
                        part too); it's about pushing boundaries and seeing how far these tech skills can take me.
                    </p>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
