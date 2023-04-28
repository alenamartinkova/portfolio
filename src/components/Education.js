import React from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll";

export default function Education() {
    return (
        <section className="section" id="education">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>📚 Education</h1>
                    <p>
                        I hold a bachelor's degree in Computer Science from Technical University of Ostrava,
                        which has served as a solid foundation for my
                        career in the field.
                    </p>

                    <p>
                        Currently, I'm pursuing a master's degree in Computer Science with focus on Software Engineering
                        to enhance my knowledge and skillset further.
                    </p>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
