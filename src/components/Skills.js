import React from 'react';
import {AnimationOnScroll} from "react-animation-on-scroll";
import {Splide, SplideSlide} from "@splidejs/react-splide";
import '@splidejs/react-splide/css'

export default function Skills() {
    return (
        <section className="section" id="skills">
            <div className={'content'}>
                <AnimationOnScroll animateIn="animate__fadeInRight">
                    <h1>👩🏽‍💻 Skills</h1>
                    <p>
                        I'm well-versed in various programming languages and technologies, including HTML, CSS,
                        JavaScript, React, and PHP.
                        I'm always eager to learn new skills and stay up-to-date with the latest trends. As of now I am
                        improving in Python,
                        more precisely in Django framework.
                    </p>

                    <div className={'carousel-wrapper'}>
                        <Splide
                            options={{
                                rewind: true,
                                gap: '1rem',
                                width: 300,
                                height: 200,
                                autoplay: true,
                                arrows: false,
                                pagination: false
                            }}>
                            <SplideSlide>
                                <img src={'images/php.png'} alt={'php'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/react.png'} alt={'react'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/python.png'} alt={'python'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/css.png'} alt={'css'}/>
                            </SplideSlide>
                            <SplideSlide>
                                <img src={'images/js.png'} alt={'js'}/>
                            </SplideSlide>
                        </Splide>
                    </div>

                    <p>
                        🛠️ Skills-wise, I'm a bit of a Swiss Army knife. I juggle Full-Stack Development, JavaScript
                        Frameworks, Node.js, and much more. I've also dabbled in Google Cloud Platform (GCP), honed my
                        skills in responsive web design, and navigated the complexities of databases with MySQL.
                    </p>
                    <p>
                        🎨 When I'm not coding, you'll find me contributing to the planning and development process,
                        leading teams, and occasionally diving into the world of graphic design decisions.
                    </p>
                </AnimationOnScroll>
            </div>
        </section>
    )
}
